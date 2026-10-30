const TABS = ['tab-forward', 'tab-hosts'];
const PANELS = ['panel-forward', 'panel-hosts'];

export function createTabs(document) {
  function activate(index, focus = false) {
    if (index < 0 || index >= TABS.length) return;
    for (const [position, id] of TABS.entries()) {
      const tab = document.getElementById(id);
      tab.setAttribute('aria-selected', String(position === index));
      tab.tabIndex = position === index ? 0 : -1;
      document.getElementById(PANELS[position]).hidden = position !== index;
    }
    if (focus) document.getElementById(TABS[index]).focus();
  }
  function bind() {
    for (const [index, id] of TABS.entries()) {
      const tab = document.getElementById(id);
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = TABS.length - 1;
        else return;
        event.preventDefault();
        activate(next, true);
      });
    }
    activate(0);
  }
  return { activate, bind };
}
