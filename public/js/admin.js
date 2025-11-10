document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password');
    const loginDiv = document.getElementById('login');
    const adminPanelDiv = document.getElementById('admin-panel');
    const adminContentDiv = document.getElementById('admin-content');
    const tabs = document.querySelectorAll('.tab-link');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAdminContent(tab.dataset.tab);
        });
    });

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
                adminPanelDiv.style.display = 'block';
                loadAdminContent('general');
            } else {
                alert('Incorrect password');
            }
        });
    });

    function loadAdminContent(tab) {
        fetch('/api/config')
            .then(response => response.json())
            .then(config => {
                adminContentDiv.innerHTML = ''; // Clear previous content
                switch (tab) {
                    case 'general':
                        renderGeneralTab(config);
                        break;
                    case 'links':
                        renderLinksTab(config);
                        break;
                    case 'campaigns':
                        renderCampaignsTab(config);
                        break;
                    case 'analytics':
                        renderAnalyticsTab(config);
                        break;
                }
            });
    }

    function renderGeneralTab(config) {
        adminContentDiv.innerHTML = `
            <div id="general-tab" class="tab-content active">
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
            </div>
        `;

        const socialLinksAdmin = document.getElementById('social-links-admin');
        config.socialLinks.forEach(link => {
            socialLinksAdmin.innerHTML += `
                <div>
                    <label>${link.name}: <input type="text" value="${link.url}"></label>
                </div>
            `;
        });

        document.getElementById('save-content').addEventListener('click', (e) => {
            const newConfig = { ...config };
            newConfig.companyName = document.getElementById('company-name-input').value;
            newConfig.description = document.getElementById('description-input').value;
            saveConfig(newConfig, e.target);
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

        document.getElementById('save-theme').addEventListener('click', (e) => {
            const newConfig = { ...config };
            newConfig.theme.primaryColor = document.getElementById('primary-color-input').value;
            newConfig.theme.secondaryColor = document.getElementById('secondary-color-input').value;
            saveConfig(newConfig, e.target);
        });

        document.getElementById('save-social-links').addEventListener('click', (e) => {
            const newConfig = { ...config };
            const socialLinksAdmin = document.getElementById('social-links-admin');
            const inputs = socialLinksAdmin.querySelectorAll('input');
            newConfig.socialLinks.forEach((link, index) => {
                link.url = inputs[index].value;
            });
            saveConfig(newConfig, e.target);
        });
    }

    function renderLinksTab(config) {
        adminContentDiv.innerHTML = `
            <div id="links-tab" class="tab-content active">
                <h2>Link Management</h2>
                <div id="links-list"></div>
                <button id="add-link">Add New Link</button>
            </div>
        `;

        const linksList = document.getElementById('links-list');
        config.links.forEach(link => {
            const linkElement = document.createElement('div');
            linkElement.classList.add('link-admin');
            linkElement.dataset.id = link.id;
            linkElement.innerHTML = `
                <div class="link-details">
                    <img src="${link.icon}" style="width: 40px; height: 40px;">
                    <span>${link.text}</span>
                </div>
                <div class="link-actions">
                    <button class="edit-link">Edit</button>
                    <button class="hide-link">${link.visible ? 'Hide' : 'Show'}</button>
                    <button class="delete-link">Delete</button>
                </div>
            `;
            linksList.appendChild(linkElement);
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
            saveConfig(newConfig).then(() => loadAdminContent('links'));
        });

        linksList.addEventListener('click', (event) => {
            const linkId = event.target.closest('.link-admin').dataset.id;
            const newConfig = { ...config };
            const link = newConfig.links.find(l => l.id === linkId);

            if (event.target.classList.contains('save-edit-link')) {
                const linkAdmin = event.target.closest('.link-admin');
                link.text = linkAdmin.querySelector('.link-text-edit').value;
                link.url = linkAdmin.querySelector('.link-url-edit').value;
                const iconFile = linkAdmin.querySelector('.link-icon-edit').files[0];
                if (iconFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result.split(',')[1];
                        fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: iconFile.name, content })
                        })
                        .then(response => response.json())
                        .then(data => {
                            link.icon = data.url;
                            saveConfig(newConfig).then(() => loadAdminContent('links'));
                        });
                    };
                    reader.readAsDataURL(iconFile);
                } else {
                    saveConfig(newConfig).then(() => loadAdminContent('links'));
                }
            }

            if (event.target.classList.contains('cancel-edit-link')) {
                loadAdminContent('links');
            }

            if (event.target.classList.contains('edit-link')) {
                const linkAdmin = event.target.closest('.link-admin');
                linkAdmin.innerHTML = `
                    <input type="text" class="link-text-edit" value="${link.text}">
                    <input type="text" class="link-url-edit" value="${link.url}">
                    <input type="file" class="link-icon-edit">
                    <button class="save-edit-link">Save</button>
                    <button class="cancel-edit-link">Cancel</button>
                `;
            }

            if (event.target.classList.contains('hide-link')) {
                link.visible = !link.visible;
                saveConfig(newConfig).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('delete-link')) {
                if (confirm('Are you sure you want to delete this link?')) {
                    newConfig.links = newConfig.links.filter(l => l.id !== linkId);
                    saveConfig(newConfig).then(() => loadAdminContent('links'));
                }
            }
        });
    }

    function renderCampaignsTab(config) {
        adminContentDiv.innerHTML = `
            <div id="campaigns-tab" class="tab-content active">
                <h2>Campaign Management</h2>
                <div id="campaigns-list"></div>
                <button id="add-campaign">Add New Campaign</button>
            </div>
        `;

        const campaignsList = document.getElementById('campaigns-list');
        config.campaigns.forEach(campaign => {
            const campaignElement = document.createElement('div');
            campaignElement.classList.add('campaign-admin');
            campaignElement.dataset.id = campaign.id;
            campaignElement.innerHTML = `
                <div>
                    <strong>${campaign.name}</strong><br>
                    <small>${new Date(campaign.startDate).toLocaleString()} - ${new Date(campaign.endDate).toLocaleString()}</small>
                </div>
                <div>
                    <button class="edit-campaign">Edit</button>
                    <button class="view-campaign-stats">View Stats</button>
                    <button class="delete-campaign">Delete</button>
                </div>
            `;
            campaignsList.appendChild(campaignElement);
        });

        document.getElementById('add-campaign').addEventListener('click', () => {
            const newConfig = { ...config };
            newConfig.campaigns.push({
                id: Date.now().toString(),
                name: 'New Campaign',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                links: []
            });
            saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
        });

        campaignsList.addEventListener('click', (event) => {
            const campaignId = event.target.closest('.campaign-admin').dataset.id;
            const newConfig = { ...config };
            const campaign = newConfig.campaigns.find(c => c.id === campaignId);

            if (event.target.classList.contains('save-edit-campaign')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                campaign.name = campaignAdmin.querySelector('.campaign-name-edit').value;
                campaign.startDate = new Date(campaignAdmin.querySelector('.campaign-start-edit').value).toISOString();
                campaign.endDate = new Date(campaignAdmin.querySelector('.campaign-end-edit').value).toISOString();
                campaign.links = Array.from(campaignAdmin.querySelectorAll('.campaign-links-edit input:checked')).map(input => input.value);
                saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
            }

            if (event.target.classList.contains('cancel-edit-campaign')) {
                loadAdminContent('campaigns');
            }

            if (event.target.classList.contains('edit-campaign')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                const campaignLinks = config.links.map(link => `
                    <div>
                        <input type="checkbox" value="${link.id}" ${campaign.links.includes(link.id) ? 'checked' : ''}>
                        <label>${link.text}</label>
                    </div>
                `).join('');
                campaignAdmin.innerHTML = `
                    <input type="text" class="campaign-name-edit" value="${campaign.name}">
                    <input type="datetime-local" class="campaign-start-edit" value="${campaign.startDate.slice(0, 16)}">
                    <input type="datetime-local" class="campaign-end-edit" value="${campaign.endDate.slice(0, 16)}">
                    <h4>Links</h4>
                    <div class="campaign-links-edit">${campaignLinks}</div>
                    <button class="save-edit-campaign">Save</button>
                    <button class="cancel-edit-campaign">Cancel</button>
                `;
            }

            if (event.target.classList.contains('view-campaign-stats')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                fetch('/api/analytics')
                    .then(response => response.json())
                    .then(analytics => {
                        const campaignStartDate = new Date(campaign.startDate);
                        const campaignEndDate = new Date(campaign.endDate);
                        const campaignVisits = analytics.visits.filter(visit => {
                            const visitDate = new Date(visit.timestamp);
                            return visitDate >= campaignStartDate && visitDate <= campaignEndDate;
                        });
                        const campaignClicks = analytics.clicks.filter(click => {
                            const clickDate = new Date(click.timestamp);
                            return clickDate >= campaignStartDate && clickDate <= campaignEndDate;
                        });

                        const statsContainer = document.createElement('div');
                        statsContainer.innerHTML = `
                            <h4>Stats for ${campaign.name}</h4>
                            <p>Total Visits: ${campaignVisits.length}</p>
                            <p>Total Clicks: ${campaignClicks.length}</p>
                            <canvas id="campaign-clicks-chart-${campaign.id}"></canvas>
                        `;
                        campaignAdmin.appendChild(statsContainer);

                        const clicksPerLink = {};
                        campaignClicks.forEach(click => {
                            clicksPerLink[click.linkId] = (clicksPerLink[click.linkId] || 0) + 1;
                        });

                        const linkLabels = [];
                        const clickCounts = [];
                        for (const linkId in clicksPerLink) {
                            const link = config.links.find(l => l.id === linkId);
                            if (link) {
                                linkLabels.push(link.text);
                                clickCounts.push(clicksPerLink[linkId]);
                            }
                        }

                        new Chart(document.getElementById(`campaign-clicks-chart-${campaign.id}`), {
                            type: 'bar',
                            data: {
                                labels: linkLabels,
                                datasets: [{
                                    label: 'Clicks per Link',
                                    data: clickCounts,
                                    backgroundColor: '#36a2eb'
                                }]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    y: { beginAtZero: true }
                                }
                            }
                        });
                    });
            }

            if (event.target.classList.contains('delete-campaign')) {
                if (confirm('Are you sure you want to delete this campaign?')) {
                    newConfig.campaigns = newConfig.campaigns.filter(c => c.id !== campaignId);
                    saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
                }
            }
        });
    }

    function renderAnalyticsTab(config) {
        adminContentDiv.innerHTML = `
            <div id="analytics-tab" class="tab-content active">
                <h2>Analytics</h2>
                <canvas id="visits-chart"></canvas>
                <canvas id="clicks-chart"></canvas>
            </div>
        `;

        fetch('/api/analytics')
            .then(response => response.json())
            .then(analytics => {
                const totalVisits = analytics.visits.length;
                const totalClicks = analytics.clicks.length;
                const abandonedVisits = totalVisits - new Set(analytics.clicks.map(c => c.ip)).size;

                new Chart(document.getElementById('visits-chart'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Followed Link', 'Abandoned'],
                        datasets: [{
                            data: [totalClicks, abandonedVisits],
                            backgroundColor: ['#36a2eb', '#ff6384']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: 'Visitor Engagement' }
                        }
                    }
                });

                const clicksPerLink = {};
                analytics.clicks.forEach(click => {
                    clicksPerLink[click.linkId] = (clicksPerLink[click.linkId] || 0) + 1;
                });

                const linkLabels = [];
                const clickCounts = [];
                for (const linkId in clicksPerLink) {
                    const link = config.links.find(l => l.id === linkId);
                    if (link) {
                        linkLabels.push(link.text);
                        clickCounts.push(clicksPerLink[linkId]);
                    }
                }

                new Chart(document.getElementById('clicks-chart'), {
                    type: 'bar',
                    data: {
                        labels: linkLabels,
                        datasets: [{
                            label: 'Clicks per Link',
                            data: clickCounts,
                            backgroundColor: '#36a2eb'
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            });
    }

    function showSaveConfirmation(button) {
        const originalText = button.textContent;
        button.textContent = 'Saved!';
        button.style.backgroundColor = '#28a745';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#007bff';
        }, 2000);
    }

    function saveConfig(config, button) {
        return fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        }).then(res => {
            if (res.ok && button) {
                showSaveConfirmation(button);
            }
            return res;
        });
    }
});