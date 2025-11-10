document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            document.getElementById('company-name').textContent = config.companyName;
            document.getElementById('logo').src = config.logo;
            document.getElementById('description').textContent = config.description;

            const socialLinksContainer = document.getElementById('social-links');
            config.socialLinks.forEach(link => {
                if (link.url && link.url !== '#') {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.innerHTML = `<img src="/images/icons/${link.name}.svg" alt="${link.name}">`;
                    socialLinksContainer.appendChild(a);
                }
            });

            const linksContainer = document.getElementById('links');
            let linksToShow = config.links;
            const now = new Date();
            const activeCampaign = config.campaigns.find(c => {
                const startDate = new Date(c.startDate);
                const endDate = new Date(c.endDate);
                return now >= startDate && now <= endDate;
            });

            if (activeCampaign) {
                document.body.insertAdjacentHTML('afterbegin', `<div class="campaign-message">${activeCampaign.message}</div>`);
                linksToShow = activeCampaign.links.map(linkId => config.links.find(l => l.id === linkId));
            }

            linksToShow.forEach(link => {
                if (link.visible) {
                    const a = document.createElement('a');
                    a.href = link.url;
                    a.classList.add('link');
                    a.dataset.id = link.id;
                    a.innerHTML = `<img src="${link.icon}" alt="${link.text}"><span>${link.text}</span>`;
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