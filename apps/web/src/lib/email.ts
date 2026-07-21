import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = 'RouteHub <noreply@routehub.ge>'

export interface EmailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
  /**
   * Sender override — must be an address on a domain verified in Resend.
   * Omit for the default RouteHub sender (notifications, mentions, etc.).
   */
  from?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn('Email skipped — RESEND_API_KEY not configured')
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: options.from || FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })

    if (error) {
      console.error('Resend error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Email send failed:', error)
    return false
  }
}

export async function sendTwoFactorEmail(
  to: string,
  { code, verifyLink }: { code: string; verifyLink?: string }
): Promise<boolean> {
  const text = [
    'RouteHub — შესვლის დადასტურება',
    '',
    `თქვენი დამადასტურებელი კოდია: ${code}`,
    ...(verifyLink
      ? ['', 'ან უბრალოდ გახსენით ეს ბმული იმავე მოწყობილობაზე, სადაც შესვლას ცდილობთ:', verifyLink]
      : []),
    '',
    'კოდი და ბმული ძალაშია 10 წუთის განმავლობაში. თუ თქვენ არ ცდილობდით შესვლას, უგულებელყავით ეს წერილი.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">RouteHub — შესვლის დადასტურება</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;line-height:1.6;">თქვენი დამადასტურებელი კოდია:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:0.3em;text-align:center;color:#111;margin:16px 0;">${code}</p>
      ${
        verifyLink
          ? `<p style="color:#374151;line-height:1.6;">ან გახსენით ეს ბმული იმავე მოწყობილობაზე, სადაც შესვლას ცდილობთ:</p>
      <a href="${verifyLink}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#6161FF;color:white;text-decoration:none;border-radius:8px;">შესვლის დადასტურება</a>`
          : ''
      }
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">კოდი და ბმული ძალაშია 10 წუთის განმავლობაში. თუ თქვენ არ ცდილობდით შესვლას, უგულებელყავით ეს წერილი.</p>
    </div>
  </div>
</body></html>`

  return sendEmail({ to, subject: 'RouteHub — შესვლის დადასტურების კოდი', text, html })
}

export async function sendPasswordRecoveryEmail(to: string, code: string): Promise<boolean> {
  const text = [
    'RouteHub — პაროლის აღდგენა',
    '',
    `თქვენი პაროლის აღდგენის კოდია: ${code}`,
    '',
    'შეიყვანეთ ეს კოდი პაროლის აღდგენის გვერდზე.',
    '',
    'თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უგულებელყავით ეს წერილი — თქვენი პაროლი უცვლელი დარჩება.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">RouteHub — პაროლის აღდგენა</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;line-height:1.6;">თქვენი პაროლის აღდგენის კოდია:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:0.3em;text-align:center;color:#111;margin:16px 0;">${code}</p>
      <p style="color:#374151;line-height:1.6;">შეიყვანეთ ეს კოდი პაროლის აღდგენის გვერდზე.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უგულებელყავით ეს წერილი — თქვენი პაროლი უცვლელი დარჩება.</p>
    </div>
  </div>
</body></html>`

  return sendEmail({ to, subject: 'RouteHub — პაროლის აღდგენის კოდი', text, html })
}

export async function sendPasswordChangedEmail(to: string): Promise<boolean> {
  const text = [
    'RouteHub — პაროლი შეიცვალა',
    '',
    'თქვენი ანგარიშის პაროლი წარმატებით შეიცვალა.',
    '',
    'თუ ეს თქვენ არ გაგიკეთებიათ, დაუყოვნებლივ დაუკავშირდით ადმინისტრატორს — თქვენი ელფოსტა შესაძლოა კომპრომეტირებული იყოს.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">RouteHub — პაროლი შეიცვალა</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;line-height:1.6;">თქვენი ანგარიშის პაროლი წარმატებით შეიცვალა.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">თუ ეს თქვენ არ გაგიკეთებიათ, დაუყოვნებლივ დაუკავშირდით ადმინისტრატორს — თქვენი ელფოსტა შესაძლოა კომპრომეტირებული იყოს.</p>
    </div>
  </div>
</body></html>`

  return sendEmail({ to, subject: 'RouteHub — თქვენი პაროლი შეიცვალა', text, html })
}

export async function sendLockoutEmail(to: string, retryMinutes: number): Promise<boolean> {
  const text = [
    'RouteHub — ანგარიშზე შესვლა დროებით დაიბლოკა',
    '',
    'თქვენს ანგარიშზე შესვლის რამდენიმე წარუმატებელი მცდელობა დაფიქსირდა, ამიტომ შესვლა დროებით დაიბლოკა.',
    `ხელახლა ცდა შესაძლებელი იქნება დაახლოებით ${retryMinutes} წუთში.`,
    '',
    'თუ ეს თქვენ არ ყოფილხართ, გირჩევთ შეცვალოთ პაროლი და აცნობოთ ადმინისტრატორს.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">RouteHub — შესვლა დროებით დაიბლოკა</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;line-height:1.6;">თქვენს ანგარიშზე შესვლის რამდენიმე წარუმატებელი მცდელობა დაფიქსირდა, ამიტომ შესვლა დროებით დაიბლოკა.</p>
      <p style="color:#374151;line-height:1.6;">ხელახლა ცდა შესაძლებელი იქნება დაახლოებით ${retryMinutes} წუთში.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">თუ ეს თქვენ არ ყოფილხართ, გირჩევთ შეცვალოთ პაროლი და აცნობოთ ადმინისტრატორს.</p>
    </div>
  </div>
</body></html>`

  return sendEmail({ to, subject: 'RouteHub — შესვლა დროებით დაიბლოკა', text, html })
}

export function generateAnnouncementEmail(announcement: {
  title: string
  content: string
  priority: string
  author_name: string
}) {
  const priorityPrefix =
    announcement.priority === 'urgent' ? '🚨 ' : announcement.priority === 'important' ? '⚠️ ' : ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://routehub.vercel.app'

  const text = [
    `${priorityPrefix}${announcement.title}`,
    '',
    announcement.content,
    '',
    '---',
    `გამოაქვეყნა: ${announcement.author_name}`,
    `ნახე RouteHub-ში: ${appUrl}/news`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:20px;">სიახლე — RouteHub</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      ${announcement.priority !== 'normal' ? `<span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${announcement.priority === 'urgent' ? '#fee2e2;color:#991b1b' : '#fef3c7;color:#92400e'};">${priorityPrefix}${announcement.priority === 'urgent' ? 'სასწრაფო' : 'მნიშვნელოვანი'}</span><br><br>` : ''}
      <h2 style="margin:0 0 16px;color:#111;">${announcement.title}</h2>
      <p style="color:#374151;line-height:1.6;white-space:pre-wrap;">${announcement.content}</p>
      <a href="${appUrl}/news" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#6161FF;color:white;text-decoration:none;border-radius:8px;">ნახე RouteHub-ში</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
      <p>გამოაქვეყნა: ${announcement.author_name}</p>
      <p>RouteHub</p>
    </div>
  </div>
</body></html>`

  return { text, html }
}
