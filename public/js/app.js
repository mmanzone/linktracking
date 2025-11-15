document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const tenant = path.split('/')[1];

    if (!tenant) {
        document.body.innerHTML = '<h1>Tenant not found</h1>';
        return;
    }

    const getContrastYIQ = (hexcolor) => {
        hexcolor = hexcolor.replace("#", "");
        const r = parseInt(hexcolor.substr(0, 2), 16);
        const g = parseInt(hexcolor.substr(2, 2), 16);
        const b = parseInt(hexcolor.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    fetch(`/api/config?tenant=${tenant}`)
        .then(response => {
            if (!response.ok) {
                window.location.href = '/?error=not_found';
                throw new Error('Tenant not found');
            }
            return response.json();
        })
        .then(config => {
            // Apply theme
            document.body.style.backgroundColor = config.theme.backgroundColor || '#f0f2f5';
            const container = document.querySelector('.container');
            container.style.backgroundColor = config.theme.containerColor || '#ffffff';
            
            const header = document.querySelector('header');
            header.style.backgroundColor = config.theme.primaryColor;
            const primaryTextColor = config.theme.primaryTextColor || getContrastYIQ(config.theme.primaryColor);
            header.style.color = primaryTextColor;
            
            document.documentElement.style.setProperty('--secondary-color', config.theme.secondaryColor);
            document.documentElement.style.setProperty('--secondary-text-color', config.theme.secondaryTextColor || getContrastYIQ(config.theme.secondaryColor));

            document.getElementById('company-name').textContent = config.companyName;
            document.getElementById('logo').src = config.logo;
            document.getElementById('description').textContent = config.description;

            const socialLinksContainer = document.getElementById('social-links');
            socialLinksContainer.innerHTML = ''; // Clear existing
            config.socialLinks.forEach(link => {
                if (link.url && link.url !== '#') {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.target = '_blank'; // Open in new window
                    a.dataset.id = `social-${link.name}`; // Add data-id for tracking
                    a.innerHTML = `<img src="/images/icons/${link.name}.svg" alt="${link.name}">`;
                    a.style.color = primaryTextColor;
                    socialLinksContainer.appendChild(a);
                }
            });

            socialLinksContainer.addEventListener('click', (event) => {
                const link = event.target.closest('a');
                if (link && link.dataset.id) {
                    const linkId = link.dataset.id;
                    fetch(`/api/click?tenant=${tenant}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ linkId })
                    });
                }
            });

            const linksContainer = document.getElementById('links');
            linksContainer.innerHTML = ''; // Clear existing
            let linksToShow = [];
            const now = new Date();
            const activeCampaign = config.campaigns.find(c => {
                const startDate = new Date(c.startDate);
                const endDate = new Date(c.endDate);
                return now >= startDate && now <= endDate;
            });

            if (activeCampaign && activeCampaign.message) {
                const bannerContainer = document.getElementById('campaign-banner-container');
                bannerContainer.innerHTML = `<div class="campaign-message">${activeCampaign.message}</div>`;
                const campaignBanner = bannerContainer.querySelector('.campaign-message');
                campaignBanner.style.backgroundColor = config.theme.containerColor || '#ffffff';
                campaignBanner.style.color = getContrastYIQ(config.theme.containerColor || '#ffffff');
                
                // Use the campaign's link order, filtering out any nulls if a link was deleted
                linksToShow = activeCampaign.links.map(linkId => config.links.find(l => l.id === linkId)).filter(Boolean);
            } else {
                // Outside of a campaign, show all links that are marked as visible.
                linksToShow = config.links.filter(l => l.visible);
            }

            linksToShow.forEach(link => {
                // The visibility check has already been done, so we just render.
                const a = document.createElement('a');
                a.href = link.url;
                a.target = '_blank'; // Open in new tab
                a.classList.add('link');
                a.dataset.id = link.id;
                a.innerHTML = `<img src="${link.icon}" alt="${link.text}"><span>${link.text}</span>`;
                a.style.color = 'var(--secondary-text-color)';
                linksContainer.appendChild(a);
            });
        })
        .catch(error => {
            console.error(error);
            document.body.innerHTML = '<h1>Tenant not found</h1>';
        });

    document.getElementById('links').addEventListener('click', (event) => {
        const link = event.target.closest('.link');
        if (link) {
            const linkId = link.dataset.id;
            fetch(`/api/click?tenant=${tenant}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ linkId })
            });
        }
    });

    fetch(`/api/visit?tenant=${tenant}`, { method: 'POST' });
});