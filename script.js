const seq = [
  '.eyebrow',
  'h1',
  '.lead',
  '.actions',
  '.card:nth-child(1)',
  '.card:nth-child(2)',
  '.card:nth-child(3)'
];

seq.forEach((selector, i) => {
  const el = document.querySelector(selector);
  if (!el) return;
  setTimeout(() => {
    el.classList.add('reveal');
  }, i * 120);
});

const projectsLink = document.querySelector('.btn-primary[href="#projects"]');
const projectsSection = document.querySelector('#projects');

if (projectsLink && projectsSection) {
  projectsLink.addEventListener('click', (event) => {
    event.preventDefault();
    projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#projects');
  });
}
