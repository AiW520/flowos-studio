export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall back for browsers that expose Clipboard API but deny permission.
  }

  const input = document.createElement('textarea')
  input.value = text
  input.readOnly = true
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    input.remove()
  }
}
