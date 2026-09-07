import { NextRequest, NextResponse } from 'next/server';
import { getAdminDirectory, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import {
  deleteMeeting,
  getMeeting,
  hasVideoconferenceStoreConfig,
  listMeetings,
  saveMeeting,
  updateMeeting,
  type MeetingParticipant,
  type VideoconferenceMeeting,
} from '@/app/api/_lib/videoconferenceStore';

export const dynamic = 'force-dynamic';

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function escapeHtml(val: string) {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendVideoconferenceEmail({
  toEmail,
  toName,
  subject,
  title,
  messageLines,
  meetingUrl = 'https://www.rbnbrasil.com.br/admin/videoconferencia',
}: {
  toEmail: string;
  toName: string;
  subject: string;
  title: string;
  messageLines: string[];
  meetingUrl?: string;
}) {
  if (!toEmail || !toEmail.includes('@')) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'RBN Videoconferência <noreply@rbnbrasil.com.br>';

  if (!apiKey) {
    console.log(`[RBN Videoconf Email Skipped - No RESEND_API_KEY] To: ${toEmail} | Subject: ${subject}`);
    return;
  }

  const linesHtml = messageLines
    .map((line) => `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #374151;">${escapeHtml(line)}</p>`)
    .join('');

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f4f4f6; padding: 32px 16px; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="border-bottom: 2px solid #991b1b; padding-bottom: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 800;">RBN — COMUNICAÇÃO INTERNA</p>
          <h1 style="margin: 0; font-size: 22px; color: #111827; font-weight: 700;">${escapeHtml(title)}</h1>
        </div>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #111827;">Olá, <strong>${escapeHtml(toName)}</strong>!</p>
        ${linesHtml}
        <div style="margin: 28px 0 16px;">
          <a href="${escapeHtml(meetingUrl)}" style="display: inline-block; background: #991b1b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
            Acessar Sala de Videoconferência
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
        <p style="margin: 0; font-size: 13px; color: #6b7280;">Este e-mail é enviado automaticamente pelo Portal RBN — Sistema Corporativo de Comunicação.</p>
      </div>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail de videoconferência:', err);
  }
}

async function sendSystemNotification(senderId: string, recipientId: string, text: string) {
  if (!senderId || !recipientId || senderId === recipientId) return;
  try {
    const { listConversations, saveConversation, saveMessage, saveNotification } = await import('@/app/api/_lib/messagingStore');
    const conversations = await listConversations();
    let conversation = conversations.find(
      (c) => !c.isGroup && c.participantIds.includes(senderId) && c.participantIds.includes(recipientId)
    );
    const now = new Date().toISOString();
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        participantIds: [senderId, recipientId],
        createdBy: senderId,
        createdAt: now,
        lastActivityAt: now,
        lastMessagePreview: text,
      };
      await saveConversation(conversation);
    } else {
      conversation = { ...conversation, lastActivityAt: now, lastMessagePreview: text };
      await saveConversation(conversation);
    }
    const messageId = crypto.randomUUID();
    await saveMessage({
      id: messageId,
      conversationId: conversation.id,
      senderId,
      body: text,
      createdAt: now,
    });
    await saveNotification({
      id: crypto.randomUUID(),
      userId: recipientId,
      conversationId: conversation.id,
      messageId,
      createdAt: now,
    });
  } catch (err) {
    console.error('Falha ao enviar notificação de videoconferência:', err);
  }
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return errorResponse('Sessão inválida.', 401);
  if (!hasVideoconferenceStoreConfig()) return errorResponse('Armazenamento de videoconferência não configurado.', 503);

  try {
    const url = new URL(request.url);
    const meetingId = url.searchParams.get('id')?.trim() || '';
    if (meetingId) {
      const meeting = await getMeeting(meetingId);
      if (!meeting) return errorResponse('Reunião não encontrada.', 404);
      return NextResponse.json({ ok: true, meeting });
    }

    const meetings = await listMeetings(user.role === 'admin' ? undefined : user.id);
    return NextResponse.json({ ok: true, meetings });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível carregar as reuniões.', 502);
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return errorResponse('Sessão inválida.', 401);
  if (!hasVideoconferenceStoreConfig()) return errorResponse('Armazenamento de videoconferência não configurado.', 503);

  try {
    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim().slice(0, 150);
    const description = String(body.description ?? '').trim().slice(0, 1000) || null;
    const scheduledAt = String(body.scheduledAt ?? new Date().toISOString()).trim();
    const durationMinutes = Math.max(5, Math.min(480, Number(body.durationMinutes ?? 30)));
    const instant = Boolean(body.instant);
    const rawParticipantIds = Array.isArray(body.participantIds) ? body.participantIds.map(String) : [];

    if (!title) return errorResponse('O título da reunião é obrigatório.');

    const directory = await getAdminDirectory();
    const participantsMap = new Map<string, MeetingParticipant>();

    // Add host as accepted participant
    participantsMap.set(user.id, {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'accepted',
      joinedAt: new Date().toISOString(),
    });

    // Add invited team members
    for (const pid of rawParticipantIds) {
      if (!pid || pid === user.id) continue;
      const row = directory.find((item) => String(item.id) === pid);
      if (row) {
        const name = [row.payload.name, row.payload.publicName]
          .map((value) => typeof value === 'string' ? value.trim() : '')
          .find(Boolean);
        if (!name) continue;
        const email = String(row.payload.email ?? '').trim();
        const role = String(row.payload.role ?? '').trim();
        participantsMap.set(pid, {
          userId: pid,
          name,
          email,
          role,
          status: 'invited',
        });
      }
    }

    const now = new Date().toISOString();
    const meetingId = crypto.randomUUID();
    const roomSlug = `rbn-conference-${crypto.randomUUID().slice(0, 8)}`;

    const meeting: VideoconferenceMeeting = {
      id: meetingId,
      title,
      description,
      roomName: roomSlug,
      hostId: user.id,
      hostName: user.name,
      hostEmail: user.email,
      scheduledAt: instant ? now : scheduledAt,
      durationMinutes,
      status: instant ? 'active' : 'scheduled',
      participants: [...participantsMap.values()],
      startedAt: instant ? now : null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await saveMeeting(meeting);

    // Send notifications to invited team members
    const dateFormatted = new Date(meeting.scheduledAt).toLocaleString('pt-BR');
    for (const participant of meeting.participants) {
      if (participant.userId === user.id) continue;

      const notifyText = instant
        ? `🎥 *Chamada de Vídeo Iniciada*: ${user.name} iniciou uma reunião de vídeo instantânea "*${title}*". Clique para entrar!`
        : `📅 *Convite para Videoconferência*: ${user.name} agendou a reunião "*${title}*" para ${dateFormatted} (${durationMinutes} min).`;

      await sendSystemNotification(user.id, participant.userId, notifyText);

      if (participant.email) {
        void sendVideoconferenceEmail({
          toEmail: participant.email,
          toName: participant.name,
          subject: instant ? `[RBN Video] Reunião de Vídeo Instantânea: ${title}` : `[RBN Video] Convite de Reunião: ${title}`,
          title: instant ? 'Convite para Chamada de Vídeo Instantânea' : 'Convite para Videoconferência Agendada',
          messageLines: [
            `${user.name} convidou você para a reunião de vídeo "${title}".`,
            ...(description ? [`Pauta: ${description}`] : []),
            `Data e horário: ${dateFormatted} (${durationMinutes} minutos de duração prevista).`,
            `Acesse a sala de videoconferência protegida do Portal RBN para participar.`,
          ],
        });
      }
    }

    return NextResponse.json({ ok: true, meeting }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível criar a reunião.', 502);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return errorResponse('Sessão inválida.', 401);

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id ?? '').trim();
    if (!id) return errorResponse('id é obrigatório.');

    const meeting = await getMeeting(id);
    if (!meeting) return errorResponse('Reunião não encontrada.', 404);

    const isHost = meeting.hostId === user.id || user.role === 'admin';
    const isParticipant = meeting.participants.some((p) => p.userId === user.id);

    if (!isHost && !isParticipant) {
      return errorResponse('Você não possui autorização nesta reunião.', 403);
    }

    const fieldsToUpdate: Partial<VideoconferenceMeeting> = {};

    if (body.status && ['scheduled', 'active', 'completed', 'cancelled'].includes(body.status)) {
      fieldsToUpdate.status = body.status;
      if (body.status === 'active' && !meeting.startedAt) {
        fieldsToUpdate.startedAt = new Date().toISOString();
      }
      if (body.status === 'completed' || body.status === 'cancelled') {
        fieldsToUpdate.endedAt = new Date().toISOString();
      }
    }

    if (body.rsvp && ['accepted', 'declined', 'attended'].includes(body.rsvp)) {
      fieldsToUpdate.participants = meeting.participants.map((p) =>
        p.userId === user.id ? { ...p, status: body.rsvp, joinedAt: body.rsvp === 'attended' ? new Date().toISOString() : p.joinedAt } : p
      );
    }

    await updateMeeting(id, fieldsToUpdate);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível atualizar a reunião.', 502);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return errorResponse('Sessão inválida.', 401);

  try {
    const id = new URL(request.url).searchParams.get('id')?.trim() || '';
    if (!id) return errorResponse('id é obrigatório.');

    const meeting = await getMeeting(id);
    if (!meeting) return errorResponse('Reunião não encontrada.', 404);

    if (meeting.hostId !== user.id && user.role !== 'admin') {
      return errorResponse('Apenas o organizador ou um administrador pode cancelar/excluir a reunião.', 403);
    }

    await deleteMeeting(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível excluir a reunião.', 502);
  }
}
