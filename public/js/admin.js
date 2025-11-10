document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password');
    const loginDiv = document.getElementById('login');
    const adminContentDiv = document.getElementById('admin-content');

    loginBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginDiv.style.display = 'none';
                adminContentDiv.style.display = 'block';
                loadAdminContent();
            } else {
                alert('Incorrect password');
            }
        });
    });

    function loadAdminContent() {
        fetch('/api/config')
            .then(response => response.json())
            .then(config => {
                adminContentDiv.innerHTML = `
                    <h2>Landing Page Content</h2>
                    <label>Company Name: <input type="text" id="company-name-input" value="${config.companyName}"></label><br>
                    <label>Logo: <input type="file" id="logo-upload"></label><br>
                    <img id="logo-preview" src="${config.logo}" style="max-width: 100px;"><br>
                    <label>Description: <textarea id="description-input">${config.description}</textarea></label><br>
                    <button id="save-content">Save Content</button>
                    
                    <h2>Theme</h2>
                    <label>Primary Color: <input type="color" id="primary-color-input" value="${config.theme.primaryColor}"></label><br>
                    <label>Secondary Color: <input type="color" id="secondary-color-input" value="${config.theme.secondaryColor}"></label><br>
                    <button id="save-theme">Save Theme</button>

                    <h2>Social Links</h2>
                    <div id="social-links-admin"></div>
                    <button id="save-social-links">Save Social Links</button>

                    <h2>Links</h2>
                    <div id="links-admin"></div>
                    <button id="add-link">Add Link</button>
                    <button id="save-links">Save Links</button>

                    <h2>Campaigns</h2>
                    <div id="campaigns-admin"></div>
                    <button id="add-campaign">Add Campaign</button>
                    <button id="save-campaigns">Save Campaigns</button>

                    <h2>Analytics</h2>
                    <div id="analytics"></div>
                `;

                const socialLinksAdmin = document.getElementById('social-links-admin');
                config.socialLinks.forEach(link => {
                    socialLinksAdmin.innerHTML += `
                        <div>
                            <label>${link.name}: <input type="text" value="${link.url}"></label>
                        </div>
                    `;
                });

                const linksAdmin = document.getElementById('links-admin');
                config.links.forEach(link => {
                    linksAdmin.innerHTML += `
                        <div class="link-admin" data-id="${link.id}">
                            <input type="text" class="link-text" value="${link.text}">
                            <input type="text" class="link-url" value="${link.url}">
                            <label>Icon: <input type="file" class="link-icon-upload"></label>
                            <img src="${link.icon}" style="max-width: 40px;">
                            <input type="checkbox" class="link-visible" ${link.visible ? 'checked' : ''}>
                            <button class="delete-link">Delete</button>
                        </div>
                    `;
                });

                // Add event listeners for saving, adding, deleting, etc.
                document.getElementById('save-content').addEventListener('click', () => {
                    const newConfig = { ...config };
                    newConfig.companyName = document.getElementById('company-name-input').value;
                    newConfig.description = document.getElementById('description-input').value;
                    saveConfig(newConfig);
                });

                document.getElementById('logo-upload').addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const content = e.target.result.split(',')[1];
                            fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: file.name, content })
                            })
                            .then(response => response.json())
                            .then(data => {
                                const newConfig = { ...config };
                                newConfig.logo = data.url;
                                document.getElementById('logo-preview').src = data.url;
                                saveConfig(newConfig);
                            });
                        };
                        reader.readAsDataURL(file);
                    }
                });

                document.getElementById('save-theme').addEventListener('click', () => {
                    const newConfig = { ...config };
                    newConfig.theme.primaryColor = document.getElementById('primary-color-input').value;
                    newConfig.theme.secondaryColor = document.getElementById('secondary-color-input').value;
                    saveConfig(newConfig);
                });

                document.getElementById('save-social-links').addEventListener('click', () => {
                    const newConfig = { ...config };
                    const socialLinksAdmin = document.getElementById('social-links-admin');
                    const inputs = socialLinksAdmin.querySelectorAll('input');
                    newConfig.socialLinks.forEach((link, index) => {
                        link.url = inputs[index].value;
                    });
                    saveConfig(newConfig);
                });

                document.getElementById('add-link').addEventListener('click', () => {
                    const newConfig = { ...config };
                    newConfig.links.push({
                        id: Date.now().toString(),
                        text: 'New Link',
                        url: '#',
                        icon: '/images/icons/link.svg',
                        visible: true
                    });
                    saveConfig(newConfig).then(loadAdminContent);
                });

                document.getElementById('links-admin').addEventListener('click', (event) => {
                    if (event.target.classList.contains('delete-link')) {
                        const linkId = event.target.parentElement.dataset.id;
                        const newConfig = { ...config };
                        newConfig.links = newConfig.links.filter(link => link.id !== linkId);
                        saveConfig(newConfig).then(loadAdminContent);
                    }
                });

                document.getElementById('links-admin').addEventListener('change', (event) => {
                    if (event.target.classList.contains('link-icon-upload')) {
                        const file = event.target.files[0];
                        if (file) {
                            const linkId = event.target.closest('.link-admin').dataset.id;
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const content = e.target.result.split(',')[1];
                                fetch('/api/upload', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ filename: file.name, content })
                                })
                                .then(response => response.json())
                                .then(data => {
                                    const newConfig = { ...config };
                                    const link = newConfig.links.find(l => l.id === linkId);
                                    link.icon = data.url;
                                    saveConfig(newConfig).then(loadAdminContent);
                                });
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                });

                document.getElementById('save-links').addEventListener('click', () => {
                    const newConfig = { ...config };
                    const linkElements = document.querySelectorAll('.link-admin');
                    linkElements.forEach((linkElement, index) => {
                        const linkId = linkElement.dataset.id;
                        const link = newConfig.links.find(l => l.id === linkId);
                        if (link) {
                            link.text = linkElement.querySelector('.link-text').value;
                            link.url = linkElement.querySelector('.link-url').value;
                            link.visible = linkElement.querySelector('.link-visible').checked;
                        }
                    });
                    saveConfig(newConfig);
                });

                const campaignsAdmin = document.getElementById('campaigns-admin');
                config.campaigns.forEach(campaign => {
                    campaignsAdmin.innerHTML += `
                        <div class="campaign-admin" data-id="${campaign.id}">
                            <input type="text" class="campaign-name" value="${campaign.name}">
                            <input type="date" class="campaign-start" value="${campaign.startDate}">
                            <input type="date" class="campaign-end" value="${campaign.endDate}">
                            <button class="delete-campaign">Delete</button>
                        </div>
                    `;
                });

                document.getElementById('add-campaign').addEventListener('click', () => {
                    const newConfig = { ...config };
                    newConfig.campaigns.push({
                        id: Date.now().toString(),
                        name: 'New Campaign',
                        startDate: '',
                        endDate: '',
                        links: []
                    });
                    saveConfig(newConfig).then(loadAdminContent);
                });

                document.getElementById('campaigns-admin').addEventListener('click', (event) => {
                    if (event.target.classList.contains('delete-campaign')) {
                        const campaignId = event.target.parentElement.dataset.id;
                        const newConfig = { ...config };
                        newConfig.campaigns = newConfig.campaigns.filter(c => c.id !== campaignId);
                        saveConfig(newConfig).then(loadAdminContent);
                    }
                });

                document.getElementById('save-campaigns').addEventListener('click', () => {
                    const newConfig = { ...config };
                    const campaignElements = document.querySelectorAll('.campaign-admin');
                    campaignElements.forEach((campaignElement, index) => {
                        const campaignId = campaignElement.dataset.id;
                        const campaign = newConfig.campaigns.find(c => c.id === campaignId);
                        if (campaign) {
                            campaign.name = campaignElement.querySelector('.campaign-name').value;
                            campaign.startDate = campaignElement.querySelector('.campaign-start').value;
                            campaign.endDate = campaignElement.querySelector('.campaign-end').value;
                        }
                    });
                    saveConfig(newConfig);
                });

                const analyticsDiv = document.getElementById('analytics');
                fetch('/api/analytics')
                    .then(response => response.json())
                    .then(analytics => {
                        const totalVisits = analytics.visits.length;
                        const uniqueVisits = new Set(analytics.visits.map(v => v.ip)).size;
                        const totalClicks = analytics.clicks.length;
                        const abandonedVisits = totalVisits - new Set(analytics.clicks.map(c => c.ip)).size;

                        analyticsDiv.innerHTML = `
                            <h3>Overall Statistics</h3>
                            <p>Total Visits: ${totalVisits}</p>
                            <p>Unique Visits: ${uniqueVisits}</p>
                            <p>Total Clicks: ${totalClicks}</p>
                            <p>Abandoned Visits: ${abandonedVisits}</p>

                            <h3>Clicks per Link</h3>
                            <div id="clicks-per-link"></div>

                            <h3>Device Statistics</h3>
                            <div id="device-stats"></div>
                        `;

                        const clicksPerLink = {};
                        analytics.clicks.forEach(click => {
                            clicksPerLink[click.linkId] = (clicksPerLink[click.linkId] || 0) + 1;
                        });

                        const clicksPerLinkDiv = document.getElementById('clicks-per-link');
                        for (const linkId in clicksPerLink) {
                            const link = config.links.find(l => l.id === linkId);
                            if (link) {
                                clicksPerLinkDiv.innerHTML += `<p>${link.text}: ${clicksPerLink[linkId]}</p>`;
                            }
                        }

                        const deviceStats = {
                            desktop: 0,
                            ios: 0,
                            android: 0,
                            other: 0
                        };
                        analytics.visits.forEach(visit => {
                            const ua = visit.userAgent.toLowerCase();
                            if (ua.includes('windows') || ua.includes('macintosh')) {
                                deviceStats.desktop++;
                            } else if (ua.includes('iphone') || ua.includes('ipad')) {
                                deviceStats.ios++;
                            } else if (ua.includes('android')) {
                                deviceStats.android++;
                            } else {
                                deviceStats.other++;
                            }
                        });

                        const deviceStatsDiv = document.getElementById('device-stats');
                        deviceStatsDiv.innerHTML = `
                            <p>Desktop: ${deviceStats.desktop}</p>
                            <p>iOS: ${deviceStats.ios}</p>
                            <p>Android: ${deviceStats.android}</p>
                            <p>Other: ${deviceStats.other}</p>
                        `;
                    });
            });
    }

    function saveConfig(config) {
        return fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
    }
});