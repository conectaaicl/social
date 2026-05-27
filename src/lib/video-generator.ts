import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execFileAsync = promisify(execFile)

const FFMPEG      = 'ffmpeg'
const FONT_BOLD   = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'
const FONT_REG    = '/usr/share/fonts/dejavu/DejaVuSans.ttf'
const W = 720, H = 1280

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

function ffEsc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '%%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

function wrap(text: string, max = 15): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (test.length > max && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 2)
}

export interface SlideSpec {
  duration:   number
  bgColor:    string    // hex without #, e.g. '0a0a1e'
  bgImage?:   string    // local file path
  label?:     string
  labelColor?: string   // hex, default '7c3aed'
  mainLines:  string[]
  mainSize?:  number
  subLines?:  string[]
  subSize?:   number
}

function buildVF(s: SlideSpec): string {
  const filters: string[] = []

  if (s.bgImage) {
    filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase`)
    filters.push(`crop=${W}:${H}`)
    filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=black@0.50:t=fill`)
  }

  if (s.label) {
    const lc = s.labelColor || '7c3aed'
    filters.push(`drawtext=fontfile='${FONT_BOLD}':text='${ffEsc(s.label)}':fontsize=22:fontcolor=0x${lc}:x=(w-text_w)/2:y=230`)
  }

  const mainSize = s.mainSize ?? 72
  const mainStart = s.label ? 340 : 430
  const mainLH = mainSize + 16
  s.mainLines.forEach((line, i) => {
    const y = mainStart + i * mainLH
    filters.push(`drawtext=fontfile='${FONT_BOLD}':text='${ffEsc(line)}':fontsize=${mainSize}:fontcolor=black@0.45:x=(w-text_w)/2+3:y=${y + 3}`)
    filters.push(`drawtext=fontfile='${FONT_BOLD}':text='${ffEsc(line)}':fontsize=${mainSize}:fontcolor=white:x=(w-text_w)/2:y=${y}`)
  })

  if (s.subLines?.length) {
    const subSize = s.subSize ?? 40
    const subStart = mainStart + s.mainLines.length * mainLH + 22
    s.subLines.forEach((line, i) => {
      const y = subStart + i * (subSize + 8)
      filters.push(`drawtext=fontfile='${FONT_REG}':text='${ffEsc(line)}':fontsize=${subSize}:fontcolor=white@0.78:x=(w-text_w)/2:y=${y}`)
    })
  }

  // Bottom attribution bar
  filters.push(`drawbox=x=0:y=${H - 70}:w=${W}:h=70:color=black@0.40:t=fill`)
  filters.push(`drawtext=fontfile='${FONT_REG}':text='social.conectaai.cl':fontsize=20:fontcolor=white@0.45:x=(w-text_w)/2:y=${H - 38}`)

  return filters.join(',')
}

async function createSlideMP4(slide: SlideSpec, outPath: string): Promise<void> {
  const args: string[] = ['-y']

  if (slide.bgImage) {
    args.push('-loop', '1', '-i', slide.bgImage)
  } else {
    args.push('-f', 'lavfi', '-i', `color=c=0x${slide.bgColor}:size=${W}x${H}:rate=24`)
  }

  args.push('-t', String(slide.duration))
  args.push('-vf', buildVF(slide))
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24', outPath)

  await execFileAsync(FFMPEG, args)
}

async function concatClips(clips: string[], outPath: string): Promise<void> {
  const listPath = outPath.replace('.mp4', '_list.txt')
  await fs.writeFile(listPath, clips.map(p => `file '${p}'`).join('\n'))
  await execFileAsync(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath])
  await fs.unlink(listPath).catch(() => {})
}

export interface VideoScriptData {
  hook:        string
  hookSub?:    string
  slides: Array<{
    label?:    string
    labelColor?: string
    main:      string
    sub?:      string
    duration:  number
    bgVariant?: number
  }>
  cta:         string
  ctaSub?:     string
  heroImageUrl?: string
}

const COLORS: Record<string, string[]> = {
  tips:               ['0d0d22', '0f0f2a', '0b1030', '101538'],
  antes_despues:      ['180808', '081808'],
  showcase:           ['0a0f1e', '0c1226', '0f152e'],
  problema_solucion:  ['1a0505', '180a03', '051a0a', '081a06'],
}

export async function assembleVideo(
  script: VideoScriptData,
  template: string,
  outputPath: string,
  tmpDir: string
): Promise<void> {
  await fs.mkdir(tmpDir, { recursive: true })
  const clips: string[] = []
  const toClean: string[] = []

  try {
    let heroPath: string | undefined
    if (script.heroImageUrl) {
      heroPath = path.join(tmpDir, 'hero.jpg')
      await downloadImage(script.heroImageUrl, heroPath)
      toClean.push(heroPath)
    }

    // Hook slide
    const hookPath = path.join(tmpDir, 'c_hook.mp4')
    await createSlideMP4({
      duration: 3,
      bgColor: '060615',
      bgImage: heroPath,
      mainLines: wrap(script.hook, 14),
      mainSize: 84,
      subLines: script.hookSub ? wrap(script.hookSub, 22) : undefined,
      subSize: 38,
    }, hookPath)
    clips.push(hookPath)

    // Content slides
    const palette = COLORS[template] ?? COLORS.tips
    for (let i = 0; i < script.slides.length; i++) {
      const s = script.slides[i]
      const clipPath = path.join(tmpDir, `c_${i}.mp4`)
      await createSlideMP4({
        duration: s.duration,
        bgColor: palette[i % palette.length],
        label: s.label,
        labelColor: s.labelColor,
        mainLines: wrap(s.main, 15),
        mainSize: 70,
        subLines: s.sub ? wrap(s.sub, 22) : undefined,
        subSize: 38,
      }, clipPath)
      clips.push(clipPath)
    }

    // CTA slide
    const ctaPath = path.join(tmpDir, 'c_cta.mp4')
    await createSlideMP4({
      duration: 4,
      bgColor: '1a0a3e',
      label: script.cta.length > 20 ? 'ACTÚA AHORA' : undefined,
      labelColor: '22c55e',
      mainLines: wrap(script.cta, 15),
      mainSize: 72,
      subLines: script.ctaSub ? wrap(script.ctaSub, 22) : undefined,
      subSize: 38,
    }, ctaPath)
    clips.push(ctaPath)

    await concatClips(clips, outputPath)

  } finally {
    await Promise.all([...clips, ...toClean].map(p => fs.unlink(p).catch(() => {})))
  }
}
