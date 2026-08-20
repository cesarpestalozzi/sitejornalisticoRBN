'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, ImageUp, Layers3, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { getCategoryDisplayName } from '@/app/lib/categoryLabels';

type CardTemplate = 'editorial' | 'urgente' | 'clean';
type CardKind = 'news' | 'memorial';
type ExportFormat = 'png' | 'jpeg';
type HeaderTheme = 'black' | 'white';
type FooterGradient = 'dark' | 'light';
type LogoPosition = 'left' | 'center' | 'right';
type TitleFont = 'arial' | 'calibri' | 'cambria' | 'georgia' | 'impact' | 'garamond' | 'trebuchet' | 'verdana' | 'times';
type TitleFontStyle = 'regular' | 'bold' | 'italic' | 'bold-italic';
type IntroAnimation = 'fade-up' | 'slide-left' | 'zoom-in';
type PreviewKind = 'image' | 'video';
type CardGeneratorPreset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: {
    cardKind: CardKind;
    selectedTemplate: CardTemplate;
    exportFormat: ExportFormat;
    titleFont: TitleFont;
    titleFontStyle: TitleFontStyle;
    logoPosition: LogoPosition;
    introAnimation: IntroAnimation;
    headerTheme: HeaderTheme;
    footerGradient: FooterGradient;
    showCategory: boolean;
    isCategoryBackgroundTransparent: boolean;
    categoryBackgroundColor: string;
    categoryTextColor: string;
    categoryBorderColor: string;
    imageScale: number;
    imageOffsetX: number;
    imageOffsetY: number;
  };
};

type WrappedText = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const CARD_LOGO_SRC = '/rbn-card-logo.png';
const CARD_ACCENT_RED = '#C1121F';
const VIDEO_EXPORT_EXTENSION = 'webm';
const VIDEO_EXPORT_MAX_DURATION_SECONDS = 180;
const VIDEO_INTRO_DURATION_SECONDS = 1.15;
const CARD_PRESETS_STORAGE_KEY = 'rbn-card-generator-presets';

const templateOptions: Array<{
  id: CardTemplate;
  name: string;
  description: string;
}> = [
  { id: 'editorial', name: 'Editorial', description: 'Visual principal do portal, forte e equilibrado.' },
  { id: 'urgente', name: 'Urgente', description: 'Mais impacto, com tarjas e contraste forte.' },
  { id: 'clean', name: 'Clean', description: 'Leitura limpa, com composição elegante e minimalista.' },
];

const fontOptions: Array<{ id: TitleFont; label: string; family: string }> = [
  { id: 'arial', label: 'Arial', family: 'Arial, Helvetica, sans-serif' },
  { id: 'calibri', label: 'Calibri', family: 'Calibri, Arial, sans-serif' },
  { id: 'cambria', label: 'Cambria', family: 'Cambria, Georgia, serif' },
  { id: 'georgia', label: 'Georgia', family: 'Georgia, Times New Roman, serif' },
  { id: 'garamond', label: 'Garamond', family: 'Garamond, Georgia, serif' },
  { id: 'impact', label: 'Impact', family: 'Impact, Arial Black, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet', family: 'Trebuchet MS, Arial, sans-serif' },
  { id: 'verdana', label: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { id: 'times', label: 'Times', family: 'Times New Roman, Times, serif' },
];

const introAnimationOptions: Array<{ id: IntroAnimation; label: string; description: string }> = [
  { id: 'fade-up', label: 'Fade para cima', description: 'Texto e logo sobem suavemente.' },
  { id: 'slide-left', label: 'Entrada lateral', description: 'As informações entram pela esquerda.' },
  { id: 'zoom-in', label: 'Zoom suave', description: 'A informação entra com leve aproximação.' },
];

const cardKindOptions: Array<{ id: CardKind; label: string; description: string }> = [
  { id: 'news', label: 'Notícia', description: 'Card flexível para manchetes, imagem ou vídeo.' },
  { id: 'memorial', label: 'Luto / Falecimento', description: 'Modelo sóbrio com foto, nome, profissão e anos de nascimento e falecimento.' },
];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    image.src = src;
  });
}

function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanup = () => {
      video.onloadeddata = null;
      video.onerror = null;
    };

    video.onloadeddata = () => {
      cleanup();
      resolve(video);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error(`Falha ao carregar video: ${src}`));
    };
    video.src = src;
    video.load();
  });
}

function seekVideo(video: HTMLVideoElement, timeInSeconds: number) {
  return new Promise<void>((resolve, reject) => {
    const safeTime = Math.max(0, Math.min(timeInSeconds, Number.isFinite(video.duration) ? Math.max(video.duration - 0.01, 0) : timeInSeconds));

    if (safeTime === 0) {
      requestAnimationFrame(() => resolve());
      return;
    }

    const cleanup = () => {
      video.onseeked = null;
      video.onerror = null;
    };

    video.onseeked = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Falha ao preparar o video para o card.'));
    };
    video.currentTime = safeTime;
  });
}

function getFontFamily(font: TitleFont) {
  return fontOptions.find((option) => option.id === font)?.family ?? fontOptions[0].family;
}

function getFontStyleParts(fontStyle: TitleFontStyle) {
  switch (fontStyle) {
    case 'bold':
      return { fontStyle: 'normal', fontWeight: '800' };
    case 'italic':
      return { fontStyle: 'italic', fontWeight: '700' };
    case 'bold-italic':
      return { fontStyle: 'italic', fontWeight: '800' };
    default:
      return { fontStyle: 'normal', fontWeight: '700' };
  }
}

function getVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

function easeOutCubic(progress: number) {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  return 1 - (1 - safeProgress) ** 3;
}

function extractYearFromDate(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  const match = trimmedValue.match(/^(\d{4})/);
  return match ? match[1] : trimmedValue;
}

function formatMemorialYears(birthDate: string, deathDate: string) {
  const birthYear = extractYearFromDate(birthDate);
  const deathYear = extractYearFromDate(deathDate);

  if (!birthYear && !deathYear) {
    return '';
  }

  if (birthYear && deathYear) {
    return `${birthYear} - ${deathYear}`;
  }

  return birthYear || deathYear;
}

function clampVideoTrim(startTime: number, clipDuration: number, totalDuration: number) {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    return { startTime: 0, clipDuration: 5 };
  }

  const safeStart = Math.max(0, Math.min(startTime, Math.max(totalDuration - 1, 0)));
  const maxClipDuration = Math.max(1, Math.min(VIDEO_EXPORT_MAX_DURATION_SECONDS, totalDuration - safeStart));
  const safeDuration = Math.max(1, Math.min(clipDuration, maxClipDuration));

  return {
    startTime: safeStart,
    clipDuration: safeDuration,
  };
}

function formatSecondsLabel(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getIntroFrameStyle(animation: IntroAnimation, progress: number) {
  const eased = easeOutCubic(progress);

  if (animation === 'slide-left') {
    return {
      alpha: eased,
      translateX: -120 * (1 - eased),
      translateY: 0,
      scale: 1,
    };
  }

  if (animation === 'zoom-in') {
    return {
      alpha: eased,
      translateX: 0,
      translateY: 0,
      scale: 0.88 + 0.12 * eased,
    };
  }

  return {
    alpha: eased,
    translateX: 0,
    translateY: 58 * (1 - eased),
    scale: 1,
  };
}

function isCardGeneratorPreset(value: unknown): value is CardGeneratorPreset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const preset = value as CardGeneratorPreset;
  return Boolean(
    typeof preset.id === 'string' &&
      typeof preset.name === 'string' &&
      typeof preset.createdAt === 'string' &&
      typeof preset.updatedAt === 'string' &&
      preset.config &&
      typeof preset.config === 'object'
  );
}

function readCardPresetsFromStorage() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedPresets = window.localStorage.getItem(CARD_PRESETS_STORAGE_KEY);
    if (!storedPresets) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedPresets);
    return Array.isArray(parsedValue) ? parsedValue.filter(isCardGeneratorPreset) : [];
  } catch {
    return [];
  }
}

function writeCardPresetsToStorage(presets: CardGeneratorPreset[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CARD_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number
) {
  const drawScale = Math.max(1, scale);
  const baseCoverScale = Math.max(width / sourceWidth, height / sourceHeight);
  const finalScale = baseCoverScale * drawScale;
  const drawWidth = sourceWidth * finalScale;
  const drawHeight = sourceHeight * finalScale;
  const drawX = x + (width - drawWidth) / 2 + offsetX;
  const drawY = y + (height - drawHeight) / 2 + offsetY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  fontStyle: TitleFontStyle
) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const words = normalizedText.split(' ').filter(Boolean);
  const fontStyleParts = getFontStyleParts(fontStyle);

  for (let fontSize = 82; fontSize >= 42; fontSize -= 2) {
    context.font = `${fontStyleParts.fontStyle} ${fontStyleParts.fontWeight} ${fontSize}px ${fontFamily}`;
    const lineHeight = Math.round(fontSize * 1.12);
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    if (lines.length * lineHeight <= maxHeight && lines.length <= 5) {
      return {
        fontSize,
        lineHeight,
        lines,
      } satisfies WrappedText;
    }
  }

  context.font = `${fontStyleParts.fontStyle} ${fontStyleParts.fontWeight} 42px ${fontFamily}`;
  return {
    fontSize: 42,
    lineHeight: 48,
    lines: [normalizedText],
  } satisfies WrappedText;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
  context.fill();
}

function makeNearBlackTransparent(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    return image;
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (red <= 18 && green <= 18 && blue <= 18) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

function drawTemplate(
  context: CanvasRenderingContext2D,
  title: string,
  categoryLabel: string,
  showCategory: boolean,
  heroMedia: CanvasImageSource,
  heroMediaWidth: number,
  heroMediaHeight: number,
  logoImage: HTMLImageElement | null,
  template: CardTemplate,
  logoPosition: LogoPosition,
  headerTheme: HeaderTheme,
  footerGradient: FooterGradient,
  imageScale: number,
  imageOffsetX: number,
  imageOffsetY: number,
  isCategoryBackgroundTransparent: boolean,
  categoryBackgroundColor: string,
  categoryTextColor: string,
  categoryBorderColor: string,
  titleFont: TitleFont,
  titleFontStyle: TitleFontStyle,
  introAnimation: IntroAnimation,
  animationProgress: number
) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const titleFontFamily = getFontFamily(titleFont);
  const fontStyleParts = getFontStyleParts(titleFontStyle);
  const introFrameStyle = getIntroFrameStyle(introAnimation, animationProgress);
  drawCoverImage(
    context,
    heroMedia,
    heroMediaWidth,
    heroMediaHeight,
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    imageScale,
    imageOffsetX,
    imageOffsetY
  );

  const bottomGradient = context.createLinearGradient(0, CANVAS_HEIGHT - 520, 0, CANVAS_HEIGHT);
  if (footerGradient === 'light') {
    bottomGradient.addColorStop(0, 'rgba(255,255,255,0)');
    bottomGradient.addColorStop(0.34, 'rgba(255,255,255,0.62)');
    bottomGradient.addColorStop(1, 'rgba(255,255,255,0.98)');
  } else {
    bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGradient.addColorStop(0.35, 'rgba(0,0,0,0.5)');
    bottomGradient.addColorStop(1, 'rgba(0,0,0,0.95)');
  }
  context.fillStyle = bottomGradient;
  context.fillRect(0, CANVAS_HEIGHT - 520, CANVAS_WIDTH, 520);

  if (template === 'clean') {
    context.fillStyle = 'rgba(255,255,255,0.08)';
    context.fillRect(40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80);
  }

  if (logoImage) {
    const preparedLogo = makeNearBlackTransparent(logoImage);
    const sourceWidth = 'naturalWidth' in preparedLogo ? preparedLogo.naturalWidth : preparedLogo.width;
    const sourceHeight = 'naturalHeight' in preparedLogo ? preparedLogo.naturalHeight : preparedLogo.height;
    const maxLogoWidth = 580;
    const maxLogoHeight = 208;
    const logoRatio = sourceWidth / sourceHeight;
    let logoWidth = maxLogoWidth;
    let logoHeight = logoWidth / logoRatio;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight * logoRatio;
    }

    const logoX =
      logoPosition === 'left'
        ? 44
        : logoPosition === 'center'
          ? (CANVAS_WIDTH - logoWidth) / 2
          : CANVAS_WIDTH - logoWidth - 44;

    context.drawImage(preparedLogo, logoX, 38, logoWidth, logoHeight);
  }

  context.save();
  context.globalAlpha = introFrameStyle.alpha;
  context.translate(introFrameStyle.translateX, introFrameStyle.translateY);
  context.scale(introFrameStyle.scale, introFrameStyle.scale);
  const categoryX = 72;
  const categoryY = template === 'clean' ? 860 : 900;
  let titleStartY = categoryY + 68;

  if (showCategory) {
    context.font = `${fontStyleParts.fontStyle} 700 30px ${titleFontFamily}`;
    const categoryWidth = Math.min(460, Math.max(190, context.measureText(categoryLabel.toUpperCase()).width + 52));
    context.fillStyle = isCategoryBackgroundTransparent ? 'rgba(255,255,255,0)' : categoryBackgroundColor;
    drawRoundedRect(context, categoryX, categoryY, categoryWidth, 58, 29);
    context.lineWidth = 3;
    context.strokeStyle = categoryBorderColor;
    context.stroke();
    context.fillStyle = categoryTextColor;
    context.fillText(categoryLabel.toUpperCase(), categoryX + 26, categoryY + 38);
    titleStartY = categoryY + 126;
  }

  const wrappedTitle = wrapText(context, title, CANVAS_WIDTH - 144, 320, titleFontFamily, titleFontStyle);
  context.fillStyle = footerGradient === 'light' ? '#111111' : '#FFFFFF';
  context.font = `${fontStyleParts.fontStyle} ${fontStyleParts.fontWeight} ${wrappedTitle.fontSize}px ${titleFontFamily}`;

  wrappedTitle.lines.forEach((line, index) => {
    context.fillText(line, 72, titleStartY + index * wrappedTitle.lineHeight);
  });
  context.restore();
}

function drawMemorialTemplate(
  context: CanvasRenderingContext2D,
  heroMedia: CanvasImageSource,
  heroMediaWidth: number,
  heroMediaHeight: number,
  logoImage: HTMLImageElement | null,
  logoPosition: LogoPosition,
  fullName: string,
  profession: string,
  birthDate: string,
  deathDate: string,
  titleFont: TitleFont,
  titleFontStyle: TitleFontStyle,
  imageScale: number,
  imageOffsetX: number,
  imageOffsetY: number
) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const titleFontFamily = getFontFamily(titleFont);
  const fontStyleParts = getFontStyleParts(titleFontStyle);

  context.save();
  if ('filter' in context) {
    context.filter = 'grayscale(100%) contrast(112%) brightness(0.82)';
  }
  drawCoverImage(
    context,
    heroMedia,
    heroMediaWidth,
    heroMediaHeight,
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    imageScale,
    imageOffsetX,
    imageOffsetY
  );
  context.restore();

  const overlayGradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  overlayGradient.addColorStop(0, 'rgba(5,5,5,0.78)');
  overlayGradient.addColorStop(0.38, 'rgba(8,8,8,0.34)');
  overlayGradient.addColorStop(1, 'rgba(0,0,0,0.9)');
  context.fillStyle = overlayGradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (logoImage) {
    const preparedLogo = makeNearBlackTransparent(logoImage);
    const sourceWidth = 'naturalWidth' in preparedLogo ? preparedLogo.naturalWidth : preparedLogo.width;
    const sourceHeight = 'naturalHeight' in preparedLogo ? preparedLogo.naturalHeight : preparedLogo.height;
    const maxLogoWidth = 400;
    const maxLogoHeight = 138;
    const logoRatio = sourceWidth / sourceHeight;
    let logoWidth = maxLogoWidth;
    let logoHeight = logoWidth / logoRatio;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight * logoRatio;
    }

    const logoX =
      logoPosition === 'left'
        ? 44
        : logoPosition === 'center'
          ? (CANVAS_WIDTH - logoWidth) / 2
          : CANVAS_WIDTH - logoWidth - 44;
    context.drawImage(preparedLogo, logoX, 76, logoWidth, logoHeight);
  }

  context.textAlign = 'center';
  const normalizedName = fullName.trim().toUpperCase();
  const normalizedProfession = profession.trim().toUpperCase();
  const yearsLine = formatMemorialYears(birthDate, deathDate);

  const wrappedName = wrapText(context, normalizedName, CANVAS_WIDTH - 180, 260, titleFontFamily, titleFontStyle);
  context.fillStyle = '#FFFFFF';
  context.font = `${fontStyleParts.fontStyle} ${fontStyleParts.fontWeight} ${wrappedName.fontSize}px ${titleFontFamily}`;
  const nameStartY = 920;

  wrappedName.lines.forEach((line, index) => {
    context.fillText(line, CANVAS_WIDTH / 2, nameStartY + index * wrappedName.lineHeight);
  });

  const professionY = nameStartY + wrappedName.lines.length * wrappedName.lineHeight + 48;
  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.font = `600 32px ${titleFontFamily}`;
  context.fillText(normalizedProfession, CANVAS_WIDTH / 2, professionY);

  context.fillStyle = '#FFFFFF';
  context.font = '500 36px Georgia, Times New Roman, serif';
  context.fillText(yearsLine, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 110);
  context.textAlign = 'start';
}

export default function GeradorCardPage() {
  const { articles, isLoaded } = useArticles();
  const [cardKind, setCardKind] = useState<CardKind>('news');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [showCategory, setShowCategory] = useState(true);
  const [memorialFullName, setMemorialFullName] = useState('');
  const [memorialProfession, setMemorialProfession] = useState('');
  const [memorialBirthDate, setMemorialBirthDate] = useState('');
  const [memorialDeathDate, setMemorialDeathDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>('editorial');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [titleFont, setTitleFont] = useState<TitleFont>('arial');
  const [titleFontStyle, setTitleFontStyle] = useState<TitleFontStyle>('bold');
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('right');
  const [introAnimation, setIntroAnimation] = useState<IntroAnimation>('fade-up');
  const [headerTheme, setHeaderTheme] = useState<HeaderTheme>('black');
  const [footerGradient, setFooterGradient] = useState<FooterGradient>('dark');
  const [imageScale, setImageScale] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [categoryBackgroundColor, setCategoryBackgroundColor] = useState('#FFFFFF');
  const [isCategoryBackgroundTransparent, setIsCategoryBackgroundTransparent] = useState(false);
  const [categoryTextColor, setCategoryTextColor] = useState(CARD_ACCENT_RED);
  const [categoryBorderColor, setCategoryBorderColor] = useState(CARD_ACCENT_RED);
  const [customImageDataUrl, setCustomImageDataUrl] = useState('');
  const [customImageName, setCustomImageName] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customVideoName, setCustomVideoName] = useState('');
  const [videoSourceDuration, setVideoSourceDuration] = useState(0);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimDuration, setVideoTrimDuration] = useState(15);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewKind, setPreviewKind] = useState<PreviewKind | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedPresets, setSavedPresets] = useState<CardGeneratorPreset[]>(() => readCardPresetsFromStorage());
  const [presetName, setPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetMessage, setPresetMessage] = useState('');
  const previewRequestIdRef = useRef(0);
  const uploadedVideoUrlRef = useRef<string | null>(null);
  const generatedVideoUrlRef = useRef<string | null>(null);

  const selectableArticles = useMemo(
    () =>
      [...articles]
        .filter((article) => article.status === 'publicado' || article.status === 'agendado' || article.status === 'rascunho')
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [articles]
  );

  useEffect(() => {
    if (!selectedArticleId && selectableArticles.length > 0) {
      setSelectedArticleId(selectableArticles[0].id);
    }
  }, [selectedArticleId, selectableArticles]);

  const selectedArticle = useMemo(
    () => selectableArticles.find((article) => article.id === selectedArticleId) ?? null,
    [selectableArticles, selectedArticleId]
  );

  useEffect(() => {
    if (!selectedArticle) {
      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
        uploadedVideoUrlRef.current = null;
      }
      if (generatedVideoUrlRef.current) {
        URL.revokeObjectURL(generatedVideoUrlRef.current);
        generatedVideoUrlRef.current = null;
      }
      setCustomTitle('');
      setCustomCategory('');
      setShowCategory(true);
      setMemorialFullName('');
      setMemorialProfession('');
      setMemorialBirthDate('');
      setMemorialDeathDate('');
      setCustomImageDataUrl('');
      setCustomImageName('');
      setCustomVideoUrl('');
      setCustomVideoName('');
      setVideoSourceDuration(0);
      setVideoTrimStart(0);
      setVideoTrimDuration(15);
      return;
    }

    if (uploadedVideoUrlRef.current) {
      URL.revokeObjectURL(uploadedVideoUrlRef.current);
      uploadedVideoUrlRef.current = null;
    }
    if (generatedVideoUrlRef.current) {
      URL.revokeObjectURL(generatedVideoUrlRef.current);
      generatedVideoUrlRef.current = null;
    }
    setCustomTitle(selectedArticle.title);
    setCustomCategory(getCategoryDisplayName(selectedArticle.category));
    setShowCategory(true);
    setCustomImageDataUrl('');
    setCustomImageName('');
    setCustomVideoUrl('');
    setCustomVideoName('');
    setVideoSourceDuration(0);
    setVideoTrimStart(0);
    setVideoTrimDuration(15);
    setPreviewUrl('');
    setPreviewKind(null);
    setImageScale(1);
    setImageOffsetX(0);
    setImageOffsetY(0);
    setErrorMessage('');
  }, [selectedArticleId, selectedArticle]);

  useEffect(() => {
    if (cardKind === 'memorial') {
      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
        uploadedVideoUrlRef.current = null;
      }
      if (generatedVideoUrlRef.current) {
        URL.revokeObjectURL(generatedVideoUrlRef.current);
        generatedVideoUrlRef.current = null;
      }
      setCustomVideoUrl('');
      setCustomVideoName('');
      setVideoSourceDuration(0);
      setVideoTrimStart(0);
      setVideoTrimDuration(15);
      setPreviewKind(null);
      setErrorMessage('');
    }
  }, [cardKind]);

  useEffect(() => {
    setSavedPresets(readCardPresetsFromStorage());

    const syncPresetsFromStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CARD_PRESETS_STORAGE_KEY) {
        return;
      }

      setSavedPresets(readCardPresetsFromStorage());
    };

    window.addEventListener('storage', syncPresetsFromStorage);
    return () => window.removeEventListener('storage', syncPresetsFromStorage);
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
      }

      if (generatedVideoUrlRef.current) {
        URL.revokeObjectURL(generatedVideoUrlRef.current);
      }
    };
  }, []);

  const categoryLabel = customCategory.trim() || (selectedArticle ? getCategoryDisplayName(selectedArticle.category) : 'Geral');
  const isMemorialCard = cardKind === 'memorial';
  const isVideoSource = !isMemorialCard && Boolean(customVideoUrl);
  const currentImageSource = isMemorialCard
    ? customImageDataUrl
    : customImageDataUrl || (selectedArticle ? `/api/article-image?id=${selectedArticle.id}` : '');
  const currentSourceLabel = isMemorialCard
    ? customImageName || 'Enviar foto da pessoa'
    : customVideoName || customImageName || 'Midia da materia';
  const memorialYearsLabel = formatMemorialYears(memorialBirthDate, memorialDeathDate);
  const effectiveVideoTrim = clampVideoTrim(videoTrimStart, videoTrimDuration, videoSourceDuration);
  const effectiveVideoTrimEnd = Math.min(videoSourceDuration, effectiveVideoTrim.startTime + effectiveVideoTrim.clipDuration);
  const trimStartPercent = videoSourceDuration > 0 ? (effectiveVideoTrim.startTime / videoSourceDuration) * 100 : 0;
  const trimEndPercent = videoSourceDuration > 0 ? (effectiveVideoTrimEnd / videoSourceDuration) * 100 : 0;
  const videoTimelineMarkers = useMemo(() => {
    if (videoSourceDuration <= 0) {
      return [];
    }

    const markerCount = Math.min(8, Math.max(4, Math.ceil(videoSourceDuration / 20)));
    return Array.from({ length: markerCount + 1 }, (_, index) => {
      const ratio = index / markerCount;
      return {
        label: formatSecondsLabel(videoSourceDuration * ratio),
        percent: ratio * 100,
      };
    });
  }, [videoSourceDuration]);

  const currentPresetConfig = useMemo(
    () => ({
      cardKind,
      selectedTemplate,
      exportFormat,
      titleFont,
      titleFontStyle,
      logoPosition,
      introAnimation,
      headerTheme,
      footerGradient,
      showCategory,
      isCategoryBackgroundTransparent,
      categoryBackgroundColor,
      categoryTextColor,
      categoryBorderColor,
      imageScale,
      imageOffsetX,
      imageOffsetY,
    }),
    [
      cardKind,
      selectedTemplate,
      exportFormat,
      titleFont,
      titleFontStyle,
      logoPosition,
      introAnimation,
      headerTheme,
      footerGradient,
      showCategory,
      isCategoryBackgroundTransparent,
      categoryBackgroundColor,
      categoryTextColor,
      categoryBorderColor,
      imageScale,
      imageOffsetX,
      imageOffsetY,
    ]
  );

  const persistPresets = (nextPresets: CardGeneratorPreset[]) => {
    try {
      writeCardPresetsToStorage(nextPresets);
      setSavedPresets(nextPresets);
    } catch {
      setErrorMessage('Nao foi possivel salvar as predefinicoes do gerador de card.');
    }
  };

  const applyPreset = (preset: CardGeneratorPreset) => {
    setCardKind(preset.config.cardKind);
    setSelectedTemplate(preset.config.selectedTemplate);
    setExportFormat(preset.config.exportFormat);
    setTitleFont(preset.config.titleFont);
    setTitleFontStyle(preset.config.titleFontStyle);
    setLogoPosition(preset.config.logoPosition);
    setIntroAnimation(preset.config.introAnimation);
    setHeaderTheme(preset.config.headerTheme);
    setFooterGradient(preset.config.footerGradient);
    setShowCategory(preset.config.showCategory);
    setIsCategoryBackgroundTransparent(preset.config.isCategoryBackgroundTransparent);
    setCategoryBackgroundColor(preset.config.categoryBackgroundColor);
    setCategoryTextColor(preset.config.categoryTextColor);
    setCategoryBorderColor(preset.config.categoryBorderColor);
    setImageScale(preset.config.imageScale);
    setImageOffsetX(preset.config.imageOffsetX);
    setImageOffsetY(preset.config.imageOffsetY);
    setSelectedPresetId(preset.id);
    setPresetName(preset.name);
    setPresetMessage(`Predefinicao "${preset.name}" aplicada.`);
    setErrorMessage('');
  };

  const handleSavePreset = () => {
    const normalizedName = presetName.trim();
    if (!normalizedName) {
      setErrorMessage('Informe um nome para salvar a predefinicao.');
      return;
    }

    const now = new Date().toISOString();
    const existingPreset = savedPresets.find((preset) => preset.id === selectedPresetId) ?? savedPresets.find((preset) => preset.name.toLowerCase() === normalizedName.toLowerCase());

    const nextPreset: CardGeneratorPreset = {
      id: existingPreset?.id ?? `${Date.now()}`,
      name: normalizedName,
      createdAt: existingPreset?.createdAt ?? now,
      updatedAt: now,
      config: currentPresetConfig,
    };

    const nextPresets = existingPreset
      ? savedPresets.map((preset) => (preset.id === existingPreset.id ? nextPreset : preset))
      : [nextPreset, ...savedPresets];

    persistPresets(nextPresets);
    setSelectedPresetId(nextPreset.id);
    setPresetName(nextPreset.name);
    setPresetMessage(existingPreset ? `Predefinicao "${nextPreset.name}" atualizada.` : `Predefinicao "${nextPreset.name}" salva.`);
    setErrorMessage('');
  };

  const handleApplySelectedPreset = () => {
    const preset = savedPresets.find((currentPreset) => currentPreset.id === selectedPresetId);
    if (!preset) {
      setErrorMessage('Selecione uma predefinicao para usar.');
      return;
    }

    applyPreset(preset);
  };

  const handleDeleteSelectedPreset = () => {
    const preset = savedPresets.find((currentPreset) => currentPreset.id === selectedPresetId);
    if (!preset) {
      setErrorMessage('Selecione uma predefinicao para excluir.');
      return;
    }

    const nextPresets = savedPresets.filter((currentPreset) => currentPreset.id !== preset.id);
    persistPresets(nextPresets);
    setSelectedPresetId('');
    setPresetName('');
    setPresetMessage(`Predefinicao "${preset.name}" removida.`);
    setErrorMessage('');
  };

  const handleMediaUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage('');
    setPreviewKind(null);

    if (generatedVideoUrlRef.current) {
      URL.revokeObjectURL(generatedVideoUrlRef.current);
      generatedVideoUrlRef.current = null;
    }

    if (file.type.startsWith('video/')) {
      if (isMemorialCard) {
        setErrorMessage('O modelo de luto/falecimento usa somente foto.');
        return;
      }

      if (uploadedVideoUrlRef.current) {
        URL.revokeObjectURL(uploadedVideoUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      uploadedVideoUrlRef.current = objectUrl;
      setCustomVideoUrl(objectUrl);
      setCustomVideoName(file.name);
      setCustomImageDataUrl('');
      setCustomImageName('');
      setImageScale(1);
      setImageOffsetX(0);
      setImageOffsetY(0);
      void loadVideo(objectUrl)
        .then((video) => {
          const safeDuration =
            Number.isFinite(video.duration) && video.duration > 0
              ? Math.min(video.duration, VIDEO_EXPORT_MAX_DURATION_SECONDS)
              : 15;
          setVideoSourceDuration(safeDuration);
          setVideoTrimStart(0);
          setVideoTrimDuration(Math.min(15, Math.max(1, safeDuration)));
        })
        .catch(() => {
          setVideoSourceDuration(0);
          setVideoTrimStart(0);
          setVideoTrimDuration(15);
        });
      return;
    }

    if (uploadedVideoUrlRef.current) {
      URL.revokeObjectURL(uploadedVideoUrlRef.current);
      uploadedVideoUrlRef.current = null;
    }

    setCustomVideoUrl('');
    setCustomVideoName('');
    setVideoSourceDuration(0);
    setVideoTrimStart(0);
    setVideoTrimDuration(15);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImageDataUrl(reader.result);
        setCustomImageName(file.name);
        setImageScale(1);
        setImageOffsetX(0);
        setImageOffsetY(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const drawCurrentFrame = useCallback(
    (
      context: CanvasRenderingContext2D,
      heroMedia: CanvasImageSource,
      heroMediaWidth: number,
      heroMediaHeight: number,
      logoImage: HTMLImageElement | null,
      animationProgress = 1
    ) => {
      if (isMemorialCard) {
        drawMemorialTemplate(
          context,
          heroMedia,
          heroMediaWidth,
          heroMediaHeight,
          logoImage,
          logoPosition,
          memorialFullName,
          memorialProfession,
          memorialBirthDate,
          memorialDeathDate,
          titleFont,
          titleFontStyle,
          imageScale,
          imageOffsetX,
          imageOffsetY
        );
        return;
      }

      drawTemplate(
        context,
        customTitle.trim() || selectedArticle?.title || '',
        categoryLabel,
        showCategory,
        heroMedia,
        heroMediaWidth,
        heroMediaHeight,
        logoImage,
        selectedTemplate,
        logoPosition,
        headerTheme,
        footerGradient,
        imageScale,
        imageOffsetX,
        imageOffsetY,
        isCategoryBackgroundTransparent,
        categoryBackgroundColor,
        categoryTextColor,
        categoryBorderColor,
        titleFont,
        titleFontStyle,
        introAnimation,
        animationProgress
      );
    },
    [
      categoryBackgroundColor,
      categoryBorderColor,
      categoryLabel,
      categoryTextColor,
      customTitle,
      footerGradient,
      headerTheme,
      imageOffsetX,
      imageOffsetY,
      imageScale,
      isMemorialCard,
      introAnimation,
      isCategoryBackgroundTransparent,
      logoPosition,
      memorialBirthDate,
      memorialDeathDate,
      memorialFullName,
      memorialProfession,
      showCategory,
      selectedArticle,
      selectedTemplate,
      titleFont,
      titleFontStyle,
    ]
  );

  const generateStaticPreview = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Não foi possível iniciar o gerador da arte.');
    }

    const maybeLogoImage = await loadImage(CARD_LOGO_SRC).catch(() => null);

    if (isVideoSource && customVideoUrl) {
      const heroVideo = await loadVideo(customVideoUrl);
      await seekVideo(heroVideo, effectiveVideoTrim.startTime);
      drawCurrentFrame(context, heroVideo, heroVideo.videoWidth, heroVideo.videoHeight, maybeLogoImage, 1);
      return canvas.toDataURL('image/png');
    }

    if (!currentImageSource) {
      throw new Error(isMemorialCard ? 'Envie a foto da pessoa para gerar o card de luto.' : 'Selecione uma notícia com imagem para gerar o card.');
    }

    const heroImage = await loadImage(currentImageSource);
    drawCurrentFrame(context, heroImage, heroImage.naturalWidth, heroImage.naturalHeight, maybeLogoImage, 1);
    const mimeType = isMemorialCard ? 'image/png' : exportFormat === 'png' ? 'image/png' : 'image/jpeg';
    const quality = isMemorialCard || exportFormat === 'png' ? undefined : 0.96;
    return canvas.toDataURL(mimeType, quality);
  }, [currentImageSource, customVideoUrl, drawCurrentFrame, effectiveVideoTrim.startTime, exportFormat, isMemorialCard, isVideoSource]);

  const generateVideoPreview = useCallback(async () => {
    if (!customVideoUrl || !selectedArticle) {
      throw new Error('Envie um vídeo para gerar a versão em movimento do card.');
    }

    const mimeType = getVideoMimeType();
    if (!mimeType) {
      throw new Error('Seu navegador não suporta exportação de vídeo neste gerador.');
    }

    const [heroVideo, maybeLogoImage] = await Promise.all([loadVideo(customVideoUrl), loadImage(CARD_LOGO_SRC).catch(() => null)]);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Não foi possível iniciar o render do vídeo.');
    }

    const durationSeconds = effectiveVideoTrim.clipDuration;

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: BlobPart[] = [];

    const videoBlobPromise = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => reject(new Error('Falha ao gravar o vídeo do card.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    heroVideo.currentTime = effectiveVideoTrim.startTime;
    await heroVideo.play();
    recorder.start(250);

    await new Promise<void>((resolve) => {
      const start = performance.now();

      const renderFrame = (now: number) => {
        const elapsedSeconds = (now - start) / 1000;
        const introProgress = Math.min(elapsedSeconds / VIDEO_INTRO_DURATION_SECONDS, 1);
        drawCurrentFrame(context, heroVideo, heroVideo.videoWidth, heroVideo.videoHeight, maybeLogoImage, introProgress);

        if (elapsedSeconds < durationSeconds && heroVideo.currentTime < effectiveVideoTrim.startTime + durationSeconds) {
          requestAnimationFrame(renderFrame);
          return;
        }

        heroVideo.pause();
        recorder.stop();
        resolve();
      };

      requestAnimationFrame(renderFrame);
    });

    return videoBlobPromise;
  }, [customVideoUrl, drawCurrentFrame, effectiveVideoTrim.clipDuration, effectiveVideoTrim.startTime, selectedArticle]);

  const generateCardPreview = useCallback(
    async (showLoading = false) => {
      const hasMemorialContent = Boolean(memorialFullName.trim() && memorialProfession.trim() && memorialBirthDate && memorialDeathDate && currentImageSource);
      const hasNewsContent = Boolean(selectedArticle && (currentImageSource || isVideoSource));

      if ((isMemorialCard && !hasMemorialContent) || (!isMemorialCard && !hasNewsContent)) {
        setIsGenerating(false);
        setPreviewUrl('');
        setPreviewKind(null);
        setErrorMessage(
          isMemorialCard
            ? 'Preencha foto, nome, profissão, nascimento e falecimento para gerar o card de luto.'
            : selectedArticle
              ? 'Selecione uma notícia com mídia para gerar o card.'
              : ''
        );
        return;
      }

      const previewRequestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = previewRequestId;

      if (showLoading) {
        setIsGenerating(true);
      }
      setErrorMessage('');

      try {
        if (generatedVideoUrlRef.current && (!isVideoSource || !showLoading)) {
          URL.revokeObjectURL(generatedVideoUrlRef.current);
          generatedVideoUrlRef.current = null;
        }

        if (isVideoSource && showLoading) {
          const videoBlob = await generateVideoPreview();
          if (previewRequestId !== previewRequestIdRef.current) {
            return;
          }

          const videoUrl = URL.createObjectURL(videoBlob);
          if (generatedVideoUrlRef.current) {
            URL.revokeObjectURL(generatedVideoUrlRef.current);
          }
          generatedVideoUrlRef.current = videoUrl;
          setPreviewUrl(videoUrl);
          setPreviewKind('video');
          return;
        }

        const nextPreviewUrl = await generateStaticPreview();
        if (previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        setPreviewUrl(nextPreviewUrl);
        setPreviewKind('image');
      } catch (error) {
        if (previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Erro ao gerar card.';
        setErrorMessage(message);
      } finally {
        if (previewRequestId === previewRequestIdRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [currentImageSource, generateStaticPreview, generateVideoPreview, isMemorialCard, isVideoSource, memorialBirthDate, memorialDeathDate, memorialFullName, memorialProfession, selectedArticle]
  );

  const handleGenerateCard = useCallback(async () => {
    await generateCardPreview(true);
  }, [generateCardPreview]);

  useEffect(() => {
    const shouldPreviewMemorial = isMemorialCard
      ? Boolean(memorialFullName.trim() && memorialProfession.trim() && memorialBirthDate && memorialDeathDate && currentImageSource)
      : Boolean(selectedArticle && (currentImageSource || isVideoSource));

    if (!shouldPreviewMemorial) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void generateCardPreview(false);
    }, isVideoSource ? 180 : 120);

    return () => window.clearTimeout(timeoutId);
  }, [currentImageSource, generateCardPreview, isMemorialCard, isVideoSource, memorialBirthDate, memorialDeathDate, memorialFullName, memorialProfession, selectedArticle]);

  const handleDownloadCard = () => {
    if (!previewUrl || (!isMemorialCard && !selectedArticle)) {
      return;
    }

    if (isVideoSource && previewKind !== 'video') {
      setErrorMessage('Clique em "Gerar vídeo" para montar o vídeo completo antes de baixar.');
      return;
    }

    const link = document.createElement('a');
    link.href = previewUrl;
    const newsFileBaseName = selectedArticle ? `rbn-card-${selectedArticle.id}` : 'rbn-card';
    link.download = isVideoSource
      ? `${newsFileBaseName}.${VIDEO_EXPORT_EXTENSION}`
      : `${isMemorialCard ? 'rbn-card-luto' : newsFileBaseName}.${isMemorialCard || exportFormat === 'png' ? 'png' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#991B1B]">Instagram</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Gerador de Card</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Selecione a matéria, ajuste o título, troque a mídia se quiser e gere uma arte 1080 x 1350 pronta para publicação, inclusive em vídeo.
              </p>
            </div>
            <div className="rounded-2xl border border-[#991B1B]/15 bg-[#991B1B]/5 px-4 py-3 text-sm text-[#7F1D1D]">
              Fluxo: Publicar notícia → Gerar card → Baixar → Publicar no Instagram
            </div>
          </div>

          {!isLoaded ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">Carregando notícias...</div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <section className="space-y-6 rounded-2xl bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Configuração</h2>
                  <p className="mt-1 text-sm text-gray-500">Monte o card com base na notícia cadastrada.</p>
                </div>

                <div className="space-y-4 rounded-2xl border border-[#991B1B]/15 bg-[#fff7f7] p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Predefinicoes salvas</p>
                    <p className="mt-1 text-xs text-gray-500">Guarde seu estilo favorito do card para reaplicar sempre que quiser.</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="presetName" className="text-sm font-semibold text-gray-800">
                      Nome da predefinicao
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="presetName"
                        type="text"
                        value={presetName}
                        onChange={(event) => {
                          setPresetName(event.target.value);
                          setPresetMessage('');
                        }}
                        placeholder="Ex.: Padrao stories urgente"
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      />
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7F1D1D]"
                      >
                        <Save className="h-4 w-4" />
                        Salvar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="savedPreset" className="text-sm font-semibold text-gray-800">
                      Predefinicoes disponiveis
                    </label>
                    <select
                      id="savedPreset"
                      value={selectedPresetId}
                      onChange={(event) => {
                        const nextPresetId = event.target.value;
                        setSelectedPresetId(nextPresetId);
                        const selectedPreset = savedPresets.find((preset) => preset.id === nextPresetId);
                        setPresetName(selectedPreset?.name ?? '');
                        setPresetMessage('');
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                    >
                      <option value="">Selecione uma predefinicao salva</option>
                      {savedPresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleApplySelectedPreset}
                        disabled={!selectedPresetId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#991B1B]/20 bg-white px-4 py-3 text-sm font-semibold text-[#991B1B] transition hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Usar predefinicao
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedPreset}
                        disabled={!selectedPresetId}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {presetMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{presetMessage}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="cardKind" className="text-sm font-semibold text-gray-800">
                    Tipo de card
                  </label>
                  <select
                    id="cardKind"
                    value={cardKind}
                    onChange={(event) => setCardKind(event.target.value as CardKind)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                  >
                    {cardKindOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {cardKindOptions.find((option) => option.id === cardKind)?.description}
                  </p>
                </div>

                {!isMemorialCard ? (
                  <>
                {selectableArticles.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                    Nenhuma notícia encontrada no momento. Você ainda pode usar o tipo de card Luto / Falecimento.
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="articleId" className="text-sm font-semibold text-gray-800">
                    Notícia
                  </label>
                  <select
                    id="articleId"
                    value={selectedArticleId}
                    onChange={(event) => setSelectedArticleId(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                  >
                    {selectableArticles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.title} — {getCategoryDisplayName(article.category)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="cardTitle" className="text-sm font-semibold text-gray-800">
                    Título do card
                  </label>
                  <textarea
                    id="cardTitle"
                    rows={5}
                    value={customTitle}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                  />
                  <p className="text-xs text-gray-500">O sistema ajusta o tamanho da fonte automaticamente dentro da área do card.</p>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Categoria no card</p>
                      <p className="text-xs text-gray-500">Você pode trocar o nome da categoria ou esconder a barrinha.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={showCategory}
                        onChange={(event) => setShowCategory(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#991B1B] focus:ring-[#991B1B]"
                      />
                      Mostrar categoria
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cardCategory" className="text-sm font-semibold text-gray-800">
                      Texto da categoria
                    </label>
                    <input
                      id="cardCategory"
                      type="text"
                      value={customCategory}
                      onChange={(event) => setCustomCategory(event.target.value)}
                      placeholder="Ex.: Política"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-800">Categoria atual</label>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#991B1B]">
                      {showCategory ? categoryLabel : 'Oculta no card'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="exportFormat" className="text-sm font-semibold text-gray-800">
                      Formato de exportação
                    </label>
                    {isVideoSource ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                        WEBM (vídeo)
                      </div>
                    ) : (
                      <select
                        id="exportFormat"
                        value={exportFormat}
                        onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      >
                        <option value="png">PNG</option>
                        <option value="jpeg">JPG</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Fonte do texto</p>
                    <p className="text-xs text-gray-500">Escolha a família e o estilo, como em um editor de texto.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="titleFont" className="text-sm font-semibold text-gray-800">
                        Fonte
                      </label>
                      <select
                        id="titleFont"
                        value={titleFont}
                        onChange={(event) => setTitleFont(event.target.value as TitleFont)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      >
                        {fontOptions.map((font) => (
                          <option key={font.id} value={font.id}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="titleFontStyle" className="text-sm font-semibold text-gray-800">
                        Estilo
                      </label>
                      <select
                        id="titleFontStyle"
                        value={titleFontStyle}
                        onChange={(event) => setTitleFontStyle(event.target.value as TitleFontStyle)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      >
                        <option value="regular">Regular</option>
                        <option value="bold">Negrito</option>
                        <option value="italic">Itálico</option>
                        <option value="bold-italic">Negrito itálico</option>
                      </select>
                    </div>
                  </div>
                  <div
                    className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-lg text-gray-900"
                    style={{ fontFamily: getFontFamily(titleFont), fontStyle: titleFontStyle.includes('italic') ? 'italic' : 'normal', fontWeight: titleFontStyle.includes('bold') ? 800 : 700 }}
                  >
                    {customTitle.trim() || 'Prévia da fonte do título'}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="headerTheme" className="text-sm font-semibold text-gray-800">
                      Parte superior
                    </label>
                    <select
                      id="headerTheme"
                      value={headerTheme}
                      onChange={(event) => setHeaderTheme(event.target.value as HeaderTheme)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                    >
                      <option value="black">Preto</option>
                      <option value="white">Branco</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="footerGradient" className="text-sm font-semibold text-gray-800">
                      Gradiente inferior
                    </label>
                    <select
                      id="footerGradient"
                      value={footerGradient}
                      onChange={(event) => setFooterGradient(event.target.value as FooterGradient)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                    >
                      <option value="dark">Escuro</option>
                      <option value="light">Branco</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="logoPosition" className="text-sm font-semibold text-gray-800">
                    Posição da logo
                  </label>
                  <select
                    id="logoPosition"
                    value={logoPosition}
                    onChange={(event) => setLogoPosition(event.target.value as LogoPosition)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centro</option>
                    <option value="right">Direita</option>
                  </select>
                  <p className="text-xs text-gray-500">A logo do RBN fica sobre a imagem e voce escolhe se ela aparece do lado esquerdo, no meio ou do lado direito.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="introAnimation" className="text-sm font-semibold text-gray-800">
                    Entrada do texto
                  </label>
                  <select
                    id="introAnimation"
                    value={introAnimation}
                    onChange={(event) => setIntroAnimation(event.target.value as IntroAnimation)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                  >
                    {introAnimationOptions.map((animation) => (
                      <option key={animation.id} value={animation.id}>
                        {animation.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {introAnimationOptions.find((animation) => animation.id === introAnimation)?.description}
                    {isVideoSource ? ` O vídeo exportado usa até ${VIDEO_EXPORT_MAX_DURATION_SECONDS / 60} minutos do arquivo enviado.` : ' A animação aparece no vídeo exportado e também guia a prévia do texto.'}
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Barrinha da categoria</p>
                      <p className="text-xs text-gray-500">Agora no estilo fundo branco, texto vermelho e contorno vermelho, com cores editáveis.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryBackgroundTransparent(false);
                        setCategoryBackgroundColor('#FFFFFF');
                        setCategoryTextColor(CARD_ACCENT_RED);
                        setCategoryBorderColor(CARD_ACCENT_RED);
                      }}
                      className="text-xs font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]"
                    >
                      Padrão
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label htmlFor="categoryBackgroundColor" className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
                        Fundo
                      </label>
                      <div className="space-y-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                        <div className="flex items-center gap-3">
                          <input
                            id="categoryBackgroundColor"
                            type="color"
                            value={categoryBackgroundColor}
                            disabled={isCategoryBackgroundTransparent}
                            onChange={(event) => {
                              setCategoryBackgroundColor(event.target.value);
                            }}
                            className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {isCategoryBackgroundTransparent ? 'TRANSPARENTE' : categoryBackgroundColor.toUpperCase()}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <input
                            type="checkbox"
                            checked={isCategoryBackgroundTransparent}
                            onChange={(event) => {
                              setIsCategoryBackgroundTransparent(event.target.checked);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#991B1B] focus:ring-[#991B1B]"
                          />
                          Fundo transparente
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="categoryTextColor" className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
                        Texto
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <input
                          id="categoryTextColor"
                          type="color"
                          value={categoryTextColor}
                          onChange={(event) => {
                            setCategoryTextColor(event.target.value);
                          }}
                          className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="text-sm font-medium text-gray-700">{categoryTextColor.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="categoryBorderColor" className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">
                        Borda
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <input
                          id="categoryBorderColor"
                          type="color"
                          value={categoryBorderColor}
                          onChange={(event) => {
                            setCategoryBorderColor(event.target.value);
                          }}
                          className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="text-sm font-medium text-gray-700">{categoryBorderColor.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
                  Logo fixa do card: <span className="font-semibold text-gray-900">RBN com fundo tratado como transparente</span>. A logo fica sobre a mídia, sem frase e sem nome do autor na base, com posicao ajustavel entre esquerda, centro e direita.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="cardImage" className="text-sm font-semibold text-gray-800">
                      Trocar mídia
                    </label>
                    {(customImageDataUrl || customVideoUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (uploadedVideoUrlRef.current) {
                            URL.revokeObjectURL(uploadedVideoUrlRef.current);
                            uploadedVideoUrlRef.current = null;
                          }
                          setCustomImageDataUrl('');
                          setCustomImageName('');
                          setCustomVideoUrl('');
                          setCustomVideoName('');
                          setVideoSourceDuration(0);
                          setVideoTrimStart(0);
                          setVideoTrimDuration(15);
                          setPreviewKind(null);
                        }}
                        className="text-xs font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]"
                      >
                        Remover troca
                      </button>
                    )}
                  </div>
                  <label
                    htmlFor="cardImage"
                    className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 transition hover:border-[#991B1B]/40 hover:bg-[#fff7f7]"
                  >
                    <ImageUp className="h-5 w-5 text-[#991B1B]" />
                    <span>{currentSourceLabel || 'Enviar nova imagem ou vídeo para o card'}</span>
                  </label>
                  <input
                    id="cardImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500">Use PNG, JPG, WEBP, MP4, WEBM ou MOV. Para vídeo, o gerador exporta até 3 minutos. Se não trocar, o card usará a foto principal da matéria.</p>
                </div>

                {isVideoSource && videoSourceDuration > 0 && (
                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Corte do vídeo</p>
                      <p className="text-xs text-gray-500">
                        Escolha visualmente o trecho do vídeo que vai entrar no card. Isso ajuda a deixar o arquivo final mais leve.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#1b2430] bg-[#0f1720] px-3 py-4 text-white shadow-inner">
                      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-medium text-white/70">
                        <span>Timeline do corte</span>
                        <span>{formatSecondsLabel(videoSourceDuration)}</span>
                      </div>

                      <div className="relative mb-3 h-6">
                        <div className="absolute inset-x-0 top-3 h-px bg-white/15" />
                        {videoTimelineMarkers.map((marker) => (
                          <div
                            key={`${marker.label}-${marker.percent}`}
                            className="absolute top-0 -translate-x-1/2"
                            style={{ left: `${marker.percent}%` }}
                          >
                            <div className="mx-auto h-3 w-px bg-white/35" />
                            <span className="mt-1 block whitespace-nowrap text-[10px] text-white/65">{marker.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="relative mt-8">
                        <div
                          className="relative h-20 overflow-hidden rounded-xl border border-white/10 bg-[#101827]"
                          style={{
                            backgroundImage:
                              'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 12%, rgba(255,255,255,0.1) 12%, rgba(255,255,255,0.1) 13%, rgba(255,255,255,0.04) 13%, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.08) 26%, rgba(255,255,255,0.03) 26%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0.08) 39%, rgba(255,255,255,0.04) 39%, rgba(255,255,255,0.04) 51%, rgba(255,255,255,0.09) 51%, rgba(255,255,255,0.09) 52%, rgba(255,255,255,0.03) 52%, rgba(255,255,255,0.03) 64%, rgba(255,255,255,0.08) 64%, rgba(255,255,255,0.08) 65%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.04) 77%, rgba(255,255,255,0.08) 77%, rgba(255,255,255,0.08) 78%, rgba(255,255,255,0.04) 78%, rgba(255,255,255,0.04) 100%)',
                          }}
                        >
                          <div className="absolute inset-y-0 left-0 bg-black/45" style={{ width: `${trimStartPercent}%` }} />
                          <div
                            className="absolute inset-y-0 bg-[#991B1B]/25 ring-2 ring-[#ef4444]"
                            style={{ left: `${trimStartPercent}%`, width: `${Math.max(2, trimEndPercent - trimStartPercent)}%` }}
                          />
                          <div className="absolute inset-y-0 right-0 bg-black/45" style={{ width: `${Math.max(0, 100 - trimEndPercent)}%` }} />

                          <div
                            className="absolute inset-y-[-6px] z-10 w-[3px] rounded-full bg-[#ef4444] shadow-[0_0_0_4px_rgba(239,68,68,0.18)]"
                            style={{ left: `calc(${trimStartPercent}% - 1px)` }}
                          />
                          <div
                            className="absolute inset-y-[-6px] z-10 w-[3px] rounded-full bg-[#ef4444] shadow-[0_0_0_4px_rgba(239,68,68,0.18)]"
                            style={{ left: `calc(${trimEndPercent}% - 1px)` }}
                          />
                          <div
                            className="absolute top-[-12px] z-20 h-6 w-6 -translate-x-1/2 rounded-full border border-[#fca5a5] bg-[#991B1B] text-center text-xs leading-6 text-white shadow-lg"
                            style={{ left: `${trimStartPercent}%` }}
                          >
                            |
                          </div>
                          <div
                            className="absolute bottom-[-12px] z-20 h-6 w-6 -translate-x-1/2 rounded-full border border-[#fca5a5] bg-[#991B1B] text-center text-xs leading-6 text-white shadow-lg"
                            style={{ left: `${trimEndPercent}%` }}
                          >
                            |
                          </div>
                        </div>

                        <input
                          id="videoTrimStart"
                          type="range"
                          min="0"
                          max={Math.max(0, videoSourceDuration - 1)}
                          step="1"
                          value={Math.min(videoTrimStart, Math.max(0, videoSourceDuration - 1))}
                          onChange={(event) => {
                            const nextStart = Number(event.target.value);
                            setVideoTrimStart(nextStart);
                            const maxRemaining = Math.max(1, Math.min(VIDEO_EXPORT_MAX_DURATION_SECONDS, videoSourceDuration - nextStart));
                            setVideoTrimDuration((currentDuration) => Math.min(currentDuration, maxRemaining));
                          }}
                          className="absolute inset-x-0 top-0 h-20 w-full cursor-ew-resize opacity-0"
                        />
                        <input
                          aria-label="Fim do vídeo"
                          type="range"
                          min="1"
                          max={Math.max(1, Math.min(VIDEO_EXPORT_MAX_DURATION_SECONDS, videoSourceDuration))}
                          step="1"
                          value={effectiveVideoTrimEnd}
                          onChange={(event) => {
                            const nextEnd = Math.max(Number(event.target.value), effectiveVideoTrim.startTime + 1);
                            setVideoTrimDuration(Math.max(1, nextEnd - effectiveVideoTrim.startTime));
                          }}
                          className="absolute inset-x-0 top-0 h-20 w-full cursor-ew-resize opacity-0"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Início</p>
                        <p className="mt-1 text-base font-bold text-gray-900">{formatSecondsLabel(effectiveVideoTrim.startTime)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Fim</p>
                        <p className="mt-1 text-base font-bold text-gray-900">{formatSecondsLabel(effectiveVideoTrimEnd)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Duração</p>
                        <p className="mt-1 text-base font-bold text-gray-900">{formatSecondsLabel(effectiveVideoTrim.clipDuration)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-xs leading-6 text-gray-600">
                      Trecho atual: <span className="font-semibold text-gray-900">{formatSecondsLabel(effectiveVideoTrim.startTime)}</span> ate{' '}
                      <span className="font-semibold text-gray-900">
                        {formatSecondsLabel(effectiveVideoTrimEnd)}
                      </span>{' '}
                      de um total de <span className="font-semibold text-gray-900">{formatSecondsLabel(videoSourceDuration)}</span>.
                    </div>
                  </div>
                )}

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Ajuste manual da mídia</p>
                      <p className="text-xs text-gray-500">Controle zoom e posição da imagem ou do vídeo dentro do card.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageScale(1);
                        setImageOffsetX(0);
                        setImageOffsetY(0);
                      }}
                      className="text-xs font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]"
                    >
                      Resetar
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                      <label htmlFor="imageScale">Zoom</label>
                      <span>{imageScale.toFixed(2)}x</span>
                    </div>
                    <input
                      id="imageScale"
                      type="range"
                      min="1"
                      max="2.2"
                      step="0.05"
                      value={imageScale}
                      onChange={(event) => {
                        setImageScale(Number(event.target.value));
                      }}
                      className="w-full accent-[#991B1B]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                      <label htmlFor="imageOffsetX">Mover para os lados</label>
                      <span>{imageOffsetX}px</span>
                    </div>
                    <input
                      id="imageOffsetX"
                      type="range"
                      min="-260"
                      max="260"
                      step="5"
                      value={imageOffsetX}
                      onChange={(event) => {
                        setImageOffsetX(Number(event.target.value));
                      }}
                      className="w-full accent-[#991B1B]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                      <label htmlFor="imageOffsetY">Mover para cima/baixo</label>
                      <span>{imageOffsetY}px</span>
                    </div>
                    <input
                      id="imageOffsetY"
                      type="range"
                      min="-260"
                      max="260"
                      step="5"
                      value={imageOffsetY}
                      onChange={(event) => {
                        setImageOffsetY(Number(event.target.value));
                      }}
                      className="w-full accent-[#991B1B]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-[#991B1B]" />
                    <p className="text-sm font-semibold text-gray-800">Modelos</p>
                  </div>
                  <div className="grid gap-3">
                    {templateOptions.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          selectedTemplate === template.id
                            ? 'border-[#991B1B] bg-[#fff6f6] shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{template.name}</p>
                            <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                          </div>
                          {selectedTemplate === template.id && <Sparkles className="h-5 w-5 text-[#991B1B]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="memorialFullName" className="text-sm font-semibold text-gray-800">
                        Nome completo
                      </label>
                      <input
                        id="memorialFullName"
                        type="text"
                        value={memorialFullName}
                        onChange={(event) => setMemorialFullName(event.target.value)}
                        placeholder="Nome completo"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="memorialProfession" className="text-sm font-semibold text-gray-800">
                        Profissão
                      </label>
                      <input
                        id="memorialProfession"
                        type="text"
                        value={memorialProfession}
                        onChange={(event) => setMemorialProfession(event.target.value)}
                        placeholder="Profissão"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="memorialBirthDate" className="text-sm font-semibold text-gray-800">
                          Nascimento
                        </label>
                        <input
                          id="memorialBirthDate"
                          type="date"
                          value={memorialBirthDate}
                          onChange={(event) => setMemorialBirthDate(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="memorialDeathDate" className="text-sm font-semibold text-gray-800">
                          Falecimento
                        </label>
                        <input
                          id="memorialDeathDate"
                          type="date"
                          value={memorialDeathDate}
                          onChange={(event) => setMemorialDeathDate(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">Modelo Luto / Falecimento</p>
                      <p className="mt-2 text-sm leading-6">
                        Esse modelo gera automaticamente a foto em preto e branco, uma única logo no topo, assinatura do portal,
                        nome em destaque, profissão discreta e as datas no formato final {memorialYearsLabel || '1927 - 2026'}.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="cardImage" className="text-sm font-semibold text-gray-800">
                          Foto da pessoa
                        </label>
                        {customImageDataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomImageDataUrl('');
                              setCustomImageName('');
                              setPreviewKind(null);
                            }}
                            className="text-xs font-semibold text-[#991B1B] transition hover:text-[#7F1D1D]"
                          >
                            Remover foto
                          </button>
                        )}
                      </div>
                      <label
                        htmlFor="cardImage"
                        className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 transition hover:border-[#991B1B]/40 hover:bg-[#fff7f7]"
                      >
                        <ImageUp className="h-5 w-5 text-[#991B1B]" />
                        <span>{currentSourceLabel}</span>
                      </label>
                      <input
                        id="cardImage"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500">Envie somente a foto principal. O sistema aplica o tratamento visual automaticamente.</p>
                    </div>
                  </>
                )}

                {errorMessage && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleGenerateCard}
                    disabled={isGenerating || (isMemorialCard ? !customImageDataUrl : !selectedArticle)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#991B1B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isVideoSource ? 'Gerar vídeo' : 'Atualizar agora'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    disabled={!previewUrl || (isVideoSource && previewKind !== 'video')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27272a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isVideoSource ? 'Baixar vídeo' : 'Baixar card'}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Prévia</h2>
                    <p className="text-sm text-gray-500">
                      Formato 4:5 — 1080 x 1350 px. A prévia atualiza automaticamente enquanto voce edita
                      {isVideoSource ? ', e o botão principal gera o vídeo completo.' : '.'}
                    </p>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {isMemorialCard
                      ? 'Modelo Luto / Falecimento'
                      : selectedTemplate === 'editorial'
                        ? 'Modelo Editorial'
                        : selectedTemplate === 'urgente'
                          ? 'Modelo Urgente'
                          : 'Modelo Clean'}
                  </div>
                </div>

                <div className="flex min-h-[740px] items-center justify-center rounded-[28px] border border-dashed border-gray-300 bg-[#f8f8f8] p-4">
                  {previewUrl ? (
                    previewKind === 'video' ? (
                      <video
                        src={previewUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full max-w-[430px] rounded-[28px] border border-black/10 shadow-[0_24px_60px_rgba(17,17,17,0.16)]"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Prévia do card"
                        className="w-full max-w-[430px] rounded-[28px] border border-black/10 shadow-[0_24px_60px_rgba(17,17,17,0.16)]"
                      />
                    )
                  ) : (
                    <div className="max-w-md text-center text-gray-500">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#991B1B]/10 text-[#991B1B]">
                        <ImageUp className="h-6 w-6" />
                      </div>
                      <p className="text-base font-semibold text-gray-700">A prévia sera gerada automaticamente</p>
                      <p className="mt-2 text-sm leading-6">
                        A arte aparece em tempo real com a logo do RBN, {isMemorialCard ? 'foto tratada em preto e branco' : 'categoria, midia principal'} e titulo ajustado automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
