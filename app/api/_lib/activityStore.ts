import { hasUserStoreConfig, listStoredUsers, saveStoredUser } from '@/app/api/_lib/userStore';

export type UserActivityLog = {
  id: string;
  userId: string;
  userName: string;
  userLogin?: string;
  action: string;
  description: string;
  area: string;
  timestamp: string;
};

export async function logUserActivity(
  userId: string,
  userName: string,
  action: string,
  description: string,
  area: string,
  userLogin?: string
): Promise<UserActivityLog | null> {
  const timestamp = new Date().toISOString();
  const entry: UserActivityLog = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId,
    userName,
    userLogin,
    action,
    description,
    area,
    timestamp,
  };

  if (hasUserStoreConfig()) {
    try {
      const users = await listStoredUsers();
      const row = users.find((item) => item.id === userId);
      if (row) {
        const payload = row.payload ?? {};
        const activities = Array.isArray(payload.activities) ? payload.activities : [];
        const nextActivities = [entry, ...activities].slice(0, 100);
        await saveStoredUser(userId, {
          ...payload,
          lastSeenAt: timestamp,
          lastActivityAt: timestamp,
          lastActivity: entry,
          activities: nextActivities,
          isOnline: true,
        });
        return entry;
      }
    } catch (error) {
      console.error('Erro ao salvar atividade do usuário:', error);
    }
  }

  return entry;
}

export async function getUserActivities(userId?: string): Promise<UserActivityLog[]> {
  if (!hasUserStoreConfig()) return [];
  try {
    const users = await listStoredUsers();
    let allLogs: UserActivityLog[] = [];
    users.forEach((row) => {
      const payload = row.payload ?? {};
      if (Array.isArray(payload.activities)) {
        payload.activities.forEach((act) => {
          if (act && typeof act === 'object' && act.timestamp) {
            allLogs.push(act as UserActivityLog);
          }
        });
      }
    });

    if (userId) {
      allLogs = allLogs.filter((log) => log.userId === userId);
    }

    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allLogs;
  } catch {
    return [];
  }
}
