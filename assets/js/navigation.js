const navigation = document.querySelector('.navigation');
const toggle = navigation.querySelector('.nav-toggle');
const links = navigation.querySelector('.nav-links');
const mobile = window.matchMedia('(max-width: 899px)');
const dropdowns = navigation.querySelectorAll('.nav-dropdown');

function closeDropdowns() {
  dropdowns.forEach(dropdown => { dropdown.open = false; });
}

function setOpen(open, restoreFocus = false) {
  toggle.setAttribute('aria-expanded', String(open));
  links.hidden = mobile.matches && !open;
  if (!open) closeDropdowns();
  if (restoreFocus) toggle.focus();
}

function syncViewport() {
  const activeElement = document.activeElement;
  toggle.hidden = !mobile.matches;
  setOpen(false);
  if (mobile.matches && links.contains(activeElement)) toggle.focus();
  if (!mobile.matches && activeElement === toggle) links.querySelector('a').focus();
}

toggle.addEventListener('click', () => {
  setOpen(toggle.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('keydown', (event) => {
  const openDropdown = navigation.querySelector('.nav-dropdown[open]');
  if (event.key === 'Escape' && openDropdown) {
    openDropdown.open = false;
    openDropdown.querySelector('summary').focus();
    return;
  }
  if (event.key === 'Escape' && mobile.matches && toggle.getAttribute('aria-expanded') === 'true') {
    setOpen(false, true);
  }
});
dropdowns.forEach(dropdown => {
  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });
  dropdown.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !dropdown.contains(event.relatedTarget)) dropdown.open = false;
  });
});
document.addEventListener('click', (event) => {
  if (mobile.matches && !navigation.contains(event.target)) {
    setOpen(false, links.contains(document.activeElement));
  }
});
navigation.addEventListener('focusout', (event) => {
  if (mobile.matches && event.relatedTarget && !navigation.contains(event.relatedTarget)) setOpen(false);
});
links.addEventListener('click', (event) => {
  if (mobile.matches && event.target.closest('a')) setOpen(false, true);
});
mobile.addEventListener('change', syncViewport);
syncViewport();
