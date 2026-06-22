function removeNavPanel() {
  document.querySelector('.nav-info-panel')?.remove()
}

function showNavPanel(title, body) {
  const nav = document.querySelector('.bottom-nav')
  if (!nav) return

  removeNavPanel()
  const panel = document.createElement('section')
  panel.className = 'history-card nav-info-panel'
  panel.setAttribute('aria-live', 'polite')
  panel.innerHTML = `<h2>${title}</h2><p>${body}</p>`
  nav.insertAdjacentElement('afterend', panel)
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function clickCalmMinuteButton() {
  const buttons = [...document.querySelectorAll('button')]
  const calmButton = buttons.find((button) => button.textContent?.includes('Take a calm minute'))
  calmButton?.click()
}

function enhanceBottomNav() {
  const nav = document.querySelector('.bottom-nav')
  if (!nav || nav.dataset.enhanced === 'true') return
  nav.dataset.enhanced = 'true'

  const items = [...nav.querySelectorAll('.bottom-nav-item')]
  items.forEach((item) => {
    const label = item.textContent?.trim() || ''
    item.setAttribute('role', 'button')
    item.setAttribute('tabindex', '0')
    item.setAttribute('aria-label', label)

    const activate = () => {
      if (label.includes('Home')) {
        removeNavPanel()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (label.includes('History')) {
        const realHistory = document.querySelector('.history-card:not(.nav-info-panel)')
        if (realHistory) {
          removeNavPanel()
          realHistory.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          return
        }
        showNavPanel('Recent found places', 'Nothing saved yet. When an item is found, this area will remember where it was found on this device.')
        return
      }

      if (label.includes('Care')) {
        clickCalmMinuteButton()
        return
      }

      if (label.includes('Settings')) {
        showNavPanel('Settings', 'Simple settings live inside each tool for now. The calm minute has optional sound, and found-place history stays saved on this device.')
      }
    }

    item.addEventListener('click', activate)
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        activate()
      }
    })
  })
}

const observer = new MutationObserver(() => enhanceBottomNav())
observer.observe(document.documentElement, { childList: true, subtree: true })

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceBottomNav)
} else {
  enhanceBottomNav()
}
