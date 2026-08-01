(function () {
  'use strict';

  /* fast tag lookup */
  const tagLookup = {};
  if (typeof TAG_CONFIG !== 'undefined' && TAG_CONFIG.categories) {
    TAG_CONFIG.categories.forEach(cat => {
      cat.tags.forEach(tag => {
        tagLookup[tag.toLowerCase()] = {
          category: cat.name,
          color: cat.color,
          displayName: tag
        };
      });
    });
  }

  /** Convert hex colour to rgba string */
  function hexToRgba(hex, alpha) {
    if (hex.length === 9) hex = hex.slice(0, 7); // Strip alpha if 8-char hex provided
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }


  /* Build cards based on data in projects-data.js and dynamcally render */
  function buildProjectGrid() {
    const grid = document.querySelector('.project-grid');
    if (!grid || typeof PROJECTS_DATA === 'undefined' || !PROJECTS_DATA.length) return;

    let html = '';
    PROJECTS_DATA.forEach(proj => {
      const tagsAttr = proj.tags.join(',').toLowerCase();
      const tagPills = proj.tags.map(t => `<span class="tag-pill">${t}</span>`).join('\n              ');
      const imgSrc   = proj.image || "assets/images/default-cover.png";

      html += `
        <a
          href="projects/${proj.slug}"
          class="project-card"
          data-title="${proj.title}"
          data-tags="${tagsAttr}"
        >
          <div class="card-thumbnail">
            <img
              src="${imgSrc}"
              alt="${proj.title} cover art"
              loading="lazy"
            />
          </div>
          <div class="card-body">
            <h3>${proj.title}</h3>
            <p class="description">
              ${proj.description}
            </p>
            <div class="card-tags">
              ${tagPills}
            </div>
          </div>
        </a>`;
    });

    html += `
        <div class="no-results">
          <p>No projects match your search. Try a different query or tag.</p>
        </div>`;

    grid.innerHTML = html;
  }

  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const SCROLL_THRESHOLD = 20;

    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    }, { passive: true });
  }


  /* Apply colours to tags */
  function colorTagPills() {
    document.querySelectorAll('.tag-pill').forEach(pill => {
      const name = pill.textContent.trim().toLowerCase();
      const info = tagLookup[name];
      if (info) {
        pill.style.color = info.color;
        pill.style.borderColor = hexToRgba(info.color, 0.3);
        pill.style.backgroundColor = hexToRgba(info.color, 0.12);
      }
    });
  }


  /* Dynamically generate dropdown to filter by tag. Order by category */
  function buildFilterChecklist() {
    const checklist = document.getElementById('filter-checklist');
    if (!checklist || typeof TAG_CONFIG === 'undefined') return;

    // Collect all tags actually used by project cards
    const usedTags = new Set();
    document.querySelectorAll('.project-card').forEach(card => {
      card.dataset.tags.toLowerCase().split(',').forEach(t => usedTags.add(t.trim()));
    });

    let html = '';

    TAG_CONFIG.categories.forEach(cat => {
      // Only show categories that have at least one used tag
      const visibleTags = cat.tags.filter(t => usedTags.has(t.toLowerCase()));
      if (visibleTags.length === 0) return;

      html += `<div class="filter-category-header" style="color:${cat.color}">${cat.name}</div>`;

      visibleTags.forEach(tag => {
        html += `<label><input type="checkbox" value="${tag.toLowerCase()}"> ${tag}</label>`;
      });
    });

    checklist.innerHTML = html;
  }


  /* Dynamic search for project name and also tag */
  function initProjectFilters() {
    const searchInput = document.getElementById('project-search');
    const projectCards = document.querySelectorAll('.project-card');
    const noResults = document.querySelector('.no-results');

    // Dropdown elements
    const toggleBtn = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    const filterCount = document.querySelector('.filter-count');

    // Exit early if we're not on the projects page
    if (!searchInput || !projectCards.length) return;

    // Build the checklist from TAG_CONFIG
    buildFilterChecklist();

    // Grab checkboxes AFTER building the checklist
    const checkboxes = document.querySelectorAll('.filter-checklist input[type="checkbox"]');

    /* ---- Toggle dropdown open/close ---- */
    if (toggleBtn && filterPanel) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = filterPanel.classList.toggle('open');
        toggleBtn.classList.toggle('open', isOpen);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!filterPanel.contains(e.target) && e.target !== toggleBtn) {
          filterPanel.classList.remove('open');
          toggleBtn.classList.remove('open');
        }
      });
    }

    /* Animations: */

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => filterCards());
    });

    searchInput.addEventListener('input', () => filterCards());

    function getActiveTags() {
      const tags = [];
      checkboxes.forEach(cb => {
        if (cb.checked) tags.push(cb.value.toLowerCase());
      });
      return tags;
    }

    function filterCards() {
      const query = searchInput.value.trim().toLowerCase();
      const activeTags = getActiveTags();
      let visibleCount = 0;

      // Update the badge count
      if (filterCount) {
        const count = activeTags.length;
        filterCount.textContent = count;
        filterCount.classList.toggle('visible', count > 0);
      }

      projectCards.forEach(card => {
        const title = card.dataset.title.toLowerCase();
        const tags = card.dataset.tags.toLowerCase().split(',');

        // Search matches title OR any tag name
        const matchesSearch = !query ||
          title.includes(query) ||
          tags.some(t => t.includes(query));

        // Tag filter: if none checked → show all;
        // otherwise show card if ANY of its tags are checked (OR)
        const matchesTags = activeTags.length === 0 ||
          activeTags.some(t => tags.includes(t));

        if (matchesSearch && matchesTags) {
          card.style.display = '';
          card.style.animation = 'fadeInUp 0.35s var(--ease-smooth) both';
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.style.animation = 'none';
        }
      });

      // Show or hide the "no results" message
      if (noResults) {
        noResults.classList.toggle('visible', visibleCount === 0);
      }
    }
  }

  function initActiveNav() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.replace(/\/$/, '');

    navLinks.forEach(link => {
      const rawHref = link.getAttribute('href') || '';
      const href = rawHref.replace('.html', '').replace('../', '').replace('./', '');

      if (
        currentPath.endsWith('/' + href) ||
        currentPath.endsWith(href) ||
        (href === 'projects' && currentPath.includes('/projects'))
      ) {
        link.classList.add('active');
      }
    });
  }

  /* Automatically handle clean URLs on GitHub Pages while enabling local server testing */
  function initCleanUrls() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    if (isLocal) {
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (
          href &&
          !href.startsWith('http') &&
          !href.startsWith('#') &&
          !href.endsWith('.html') &&
          !href.endsWith('.pdf') &&
          !href.endsWith('/') &&
          href !== '.'
        ) {
          a.setAttribute('href', href + '.html');
        }
      });
    }
  }


  function initStaggerAnimation() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 0.08}s`;
    });
  }


  /* Dynamically generate footer date (last updated) */
  function initFooterDate() {
    const footerP = document.querySelector('.site-footer p');
    if (!footerP) return;

    function formatDate(d) {
      const day = d.getDate();
      const month = d.toLocaleString('en-GB', { month: 'long' });
      const year = d.getFullYear();
      return `Last updated: ${day} ${month} ${year}`;
    }

    function fallbackToLocal() {
      const mod = new Date(document.lastModified);
      const validDate = isNaN(mod.getTime()) ? new Date() : mod;
      footerP.textContent = formatDate(validDate);
    }

    fetch('https://api.github.com/repos/viren-vadhvana/portfolio/commits/main')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.commit && data.commit.committer && data.commit.committer.date) {
          const commitDate = new Date(data.commit.committer.date);
          footerP.textContent = formatDate(commitDate);
        } else {
          fallbackToLocal();
        }
      })
      .catch(() => {
        fallbackToLocal();
      });
  }


  /* Initialise all the above functions when DOM is loaded */
  document.addEventListener('DOMContentLoaded', () => {
    buildProjectGrid();
    initHeaderScroll();
    initCleanUrls();
    initActiveNav();
    colorTagPills();
    initProjectFilters();
    initStaggerAnimation();
    initFooterDate();
  });

})();
