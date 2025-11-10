document.addEventListener('DOMContentLoaded', () => {
    const getContrastYIQ = (hexcolor) => {
        hexcolor = hexcolor.replace("#", "");
        const r = parseInt(hexcolor.substr(0, 2), 16);
        const g = parseInt(hexcolor.substr(2, 2), 16);
        const b = parseInt(hexcolor.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            // Apply theme
            const header = document.querySelector('header');
            header.style.backgroundColor = config.theme.primaryColor;
            const textColor = getContrastYIQ(config.theme.primaryColor);
            header.style.color = textColor;
            document.documentElement.style.setProperty('--secondary-color', config.theme.secondaryColor);

            document.getElementById('company-name').textContent = config.companyName;
            document.getElementById('logo').src = config.logo;
            document.getElementById('description').textContent = config.description;

            const socialLinksContainer = document.getElementById('social-links');
            socialLinksContainer.innerHTML = ''; // Clear existing
            config.socialLinks.forEach(link => {
                if (link.url && link.url !== '#') {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.innerHTML = `<img src="/images/icons/${link.name}.svg" alt="${link.name}" style="filter: ${textColor === 'white' ? 'invert(1)' : 'none'};">`;
                    socialLinksContainer.appendChild(a);
                }
            });

            const linksContainer = document.getElementById('links');
            linksContainer.innerHTML = ''; // Clear existing
            let linksToShow = config.links;
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
                campaignBanner.style.backgroundColor = config.theme.secondaryColor;
                campaignBanner.style.color = getContrastYIQ(config.theme.secondaryColor);
                
                const campaignLinkIds = new Set(activeCampaign.links);
                linksToShow = config.links.filter(l => campaignLinkIds.has(l.id));
            }

            linksToShow.forEach(link => {
                if (link && link.visible) {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.classList.add('link');
                    a.dataset.id = link.id;
                    a.innerHTML = `<img src="${link.icon}" alt="${link.text}"><span>${link.text}</span>`;
                    const linkTextColor = getContrastYIQ(config.theme.secondaryColor);
                    a.style.color = linkTextColor;
                    linksContainer.appendChild(a);
                }
            });
        });

    document.getElementById('links').addEventListener('click', (event) => {
        const link = event.target.closest('.link');
        if (link) {
            const linkId = link.dataset.id;
            fetch('/api/click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ linkId })
            });
        }
    });

    fetch('/api/visit', { method: 'POST' });
});