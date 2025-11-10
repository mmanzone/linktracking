document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            // Apply theme
            document.querySelector('header').style.backgroundColor = config.theme.primaryColor;
            document.documentElement.style.setProperty('--secondary-color', config.theme.secondaryColor);

            document.getElementById('company-name').textContent = config.companyName;
            document.getElementById('app-title').textContent = config.appTitle;

            // Initialize links
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
                bannerContainer.querySelector('.campaign-message').style.backgroundColor = config.theme.secondaryColor;
                linksToShow = activeCampaign.links.map(linkId => config.links.find(l => l.id === linkId));
            }

            linksToShow.forEach(link => {
                const linkElement = document.createElement('div');
                linkElement.className = 'link';
                linkElement.dataset.id = link.id;
                linkElement.textContent = link.name;
                document.getElementById('links').appendChild(linkElement);
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
});