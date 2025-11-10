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
                <label>Primary Color: 
                    <input type="color" id="primary-color-picker" value="${config.theme.primaryColor}">
                    <input type="text" id="primary-color-input" value="${config.theme.primaryColor}" size="7">
                </label><br>
                <label>Secondary Color: 
                    <input type="color" id="secondary-color-picker" value="${config.theme.secondaryColor}">
                    <input type="text" id="secondary-color-input" value="${config.theme.secondaryColor}" size="7">
                </label><br>
                <button id="save-theme">Save Theme</button>

                <h2>Social Links</h2>
                <div id="social-links-admin"></div>
                <button id="save-social-links">Save Social Links</button>
            </div>
        `;

        const socialLinksAdmin = document.getElementById('social-links-admin');
        config.socialLinks.forEach(link => {
            const capitalizedName = link.name.charAt(0).toUpperCase() + link.name.slice(1);
            socialLinksAdmin.innerHTML += `
                <div>
                    <label>${capitalizedName}: <input type="text" value="${link.url}"></label>
                </div>
            `;
        });

        // Sync color pickers and text inputs
        const primaryColorPicker = document.getElementById('primary-color-picker');
        const primaryColorInput = document.getElementById('primary-color-input');
        primaryColorPicker.addEventListener('input', (e) => primaryColorInput.value = e.target.value);
        primaryColorInput.addEventListener('input', (e) => primaryColorPicker.value = e.target.value);

        const secondaryColorPicker = document.getElementById('secondary-color-picker');
        const secondaryColorInput = document.getElementById('secondary-color-input');
        secondaryColorPicker.addEventListener('input', (e) => secondaryColorInput.value = e.target.value);
        secondaryColorInput.addEventListener('input', (e) => secondaryColorPicker.value = e.target.value);

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
        config.links.forEach((link, index) => {
            const linkElement = document.createElement('div');
            linkElement.classList.add('link-admin');
            linkElement.dataset.id = link.id;
            linkElement.innerHTML = `
                <div class="link-order">
                    <button class="move-up" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down" ${index === config.links.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div>
                    <img src="${link.icon}" style="width: 40px; height: 40px; vertical-align: middle;">
                    <input type="file" class="link-icon-upload" style="display: none;">
                    <button class="change-icon">Change</button>
                </div>
                <input type="text" class="link-text-edit" value="${link.text}" placeholder="Link Name">
                <input type="text" class="link-url-edit" value="${link.url}" placeholder="https://...">
                <button class="hide-link">${link.visible ? 'Hide' : 'Show'}</button>
                <button class="delete-link">Delete</button>
            `;
            linksList.appendChild(linkElement);
        });

        document.getElementById('add-link').addEventListener('click', () => {
            const newConfig = { ...config };
            newConfig.links.push({
                id: Date.now().toString(),
                text: '',
                url: '',
                icon: '/images/icons/link.svg',
                visible: true
            });
            saveConfig(newConfig).then(() => loadAdminContent('links'));
        });

        linksList.addEventListener('click', (event) => {
            const linkId = event.target.closest('.link-admin').dataset.id;
            let newConfig = { ...config };
            const linkIndex = newConfig.links.findIndex(l => l.id === linkId);

            if (event.target.classList.contains('change-icon')) {
                event.target.previousElementSibling.click();
            }

            if (event.target.classList.contains('move-up')) {
                [newConfig.links[linkIndex], newConfig.links[linkIndex - 1]] = [newConfig.links[linkIndex - 1], newConfig.links[linkIndex]];
                saveConfig(newConfig).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('move-down')) {
                [newConfig.links[linkIndex], newConfig.links[linkIndex + 1]] = [newConfig.links[linkIndex + 1], newConfig.links[linkIndex]];
                saveConfig(newConfig).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('hide-link')) {
                newConfig.links[linkIndex].visible = !newConfig.links[linkIndex].visible;
                saveConfig(newConfig).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('delete-link')) {
                if (confirm('Are you sure you want to delete this link?')) {
                    newConfig.links = newConfig.links.filter(l => l.id !== linkId);
                    saveConfig(newConfig).then(() => loadAdminContent('links'));
                }
            }
        });

        linksList.addEventListener('change', (event) => {
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
                            let newConfig = { ...config };
                            const link = newConfig.links.find(l => l.id === linkId);
                            link.icon = data.url;
                            saveConfig(newConfig).then(() => loadAdminContent('links'));
                        });
                    };
                    reader.readAsDataURL(file);
                }
            }

            if (event.target.classList.contains('link-text-edit') || event.target.classList.contains('link-url-edit')) {
                const linkId = event.target.closest('.link-admin').dataset.id;
                let newConfig = { ...config };
                const link = newConfig.links.find(l => l.id === linkId);
                link.text = event.target.closest('.link-admin').querySelector('.link-text-edit').value;
                link.url = event.target.closest('.link-admin').querySelector('.link-url-edit').value;
                saveConfig(newConfig);
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
                description: '',
                message: '',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                links: config.links.map(l => l.id) // Default to all links
            });
            saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
        });

        campaignsList.addEventListener('click', (event) => {
            const campaignId = event.target.closest('.campaign-admin')?.dataset.id;
            if (!campaignId) return;

            let newConfig = { ...config };
            const campaign = newConfig.campaigns.find(c => c.id === campaignId);

            if (event.target.classList.contains('save-edit-campaign')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                const newStartDate = new Date(campaignAdmin.querySelector('.campaign-start-edit').value).toISOString();
                const newEndDate = new Date(campaignAdmin.querySelector('.campaign-end-edit').value).toISOString();

                // Overlap check
                const overlaps = newConfig.campaigns.some(c => {
                    if (c.id === campaignId) return false;
                    const existingStart = new Date(c.startDate);
                    const existingEnd = new Date(c.endDate);
                    return (new Date(newStartDate) < existingEnd && new Date(newEndDate) > existingStart);
                });

                if (overlaps) {
                    alert('Error: Campaign dates overlap with an existing campaign.');
                    return;
                }

                campaign.name = campaignAdmin.querySelector('.campaign-name-edit').value;
                campaign.description = campaignAdmin.querySelector('.campaign-description-edit').value;
                campaign.message = campaignAdmin.querySelector('.campaign-message-edit').value;
                campaign.startDate = newStartDate;
                campaign.endDate = newEndDate;
                
                const linkOrder = Array.from(campaignAdmin.querySelectorAll('.campaign-link-row')).map(row => row.dataset.id);
                campaign.links = linkOrder.filter(id => campaignAdmin.querySelector(`.campaign-link-row[data-id="${id}"] input[type="checkbox"]`).checked);

                saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
            }

            if (event.target.classList.contains('cancel-edit-campaign')) {
                loadAdminContent('campaigns');
            }

            if (event.target.classList.contains('edit-campaign')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                const campaignLinksHtml = config.links.map((link, index) => `
                    <div class="campaign-link-row" data-id="${link.id}">
                        <div class="link-order">
                            <button class="move-link-up" ${index === 0 ? 'disabled' : ''}>▲</button>
                            <button class="move-link-down" ${index === config.links.length - 1 ? 'disabled' : ''}>▼</button>
                        </div>
                        <input type="checkbox" value="${link.id}" ${campaign.links.includes(link.id) ? 'checked' : ''}>
                        <label>${link.text}</label>
                    </div>
                `).join('');
                campaignAdmin.innerHTML = `
                    <label>Campaign Name: <input type="text" class="campaign-name-edit" value="${campaign.name}"></label>
                    <label>Admin Description: <textarea class="campaign-description-edit" placeholder="For internal reference...">${campaign.description || ''}</textarea></label>
                    <label>Public Message: <textarea class="campaign-message-edit" placeholder="Displayed on the page during the campaign...">${campaign.message || ''}</textarea></label>
                    <label>Start Date/Time: <input type="datetime-local" class="campaign-start-edit" value="${campaign.startDate.slice(0, 16)}"></label>
                    <label>End Date/Time: <input type="datetime-local" class="campaign-end-edit" value="${campaign.endDate.slice(0, 16)}"></label>
                    <h4>Links</h4>
                    <div class="campaign-links-edit">${campaignLinksHtml}</div>
                    <button class="save-edit-campaign">Save</button>
                    <button class="cancel-edit-campaign">Cancel</button>
                `;
            }

            if (event.target.classList.contains('move-link-up')) {
                const linkRow = event.target.closest('.campaign-link-row');
                if (linkRow.previousElementSibling) {
                    linkRow.parentNode.insertBefore(linkRow, linkRow.previousElementSibling);
                }
            }

            if (event.target.classList.contains('move-link-down')) {
                const linkRow = event.target.closest('.campaign-link-row');
                if (linkRow.nextElementSibling) {
                    linkRow.parentNode.insertBefore(linkRow.nextElementSibling, linkRow);
                }
            }

            if (event.target.classList.contains('view-campaign-stats')) {
                const campaignAdmin = event.target.closest('.campaign-admin');
                let statsContainer = campaignAdmin.querySelector('.campaign-stats-container');
                if (statsContainer) {
                    statsContainer.remove();
                    return;
                }

                statsContainer = document.createElement('div');
                statsContainer.classList.add('campaign-stats-container');
                campaignAdmin.appendChild(statsContainer);

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
                        const abandonedCampaignVisits = campaignVisits.length - new Set(campaignClicks.map(c => c.ip)).size;

                        statsContainer.innerHTML = `
                            <h4>Stats for ${campaign.name}</h4>
                            <p>Total Visits: ${campaignVisits.length}</p>
                            <p>Total Clicks: ${campaignClicks.length}</p>
                            <p>Abandoned Visits: ${abandonedCampaignVisits}</p>
                            <canvas id="campaign-clicks-chart-${campaign.id}"></canvas>
                        `;

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
                <div id="analytics-filters">
                    <select id="date-filter">
                        <option value="30">Last 30 days</option>
                        <option value="7">Last 7 days</option>
                        <option value="1">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="90">Last 3 months</option>
                        <option value="180">Last 6 months</option>
                        <option value="365">Last 12 months</option>
                        <option value="all">All time</option>
                    </select>
                    <select id="campaign-filter"></select>
                </div>
                <h3>Visitor Engagement</h3>
                <canvas id="visits-chart"></canvas>
                <h3>Clicks per Link</h3>
                <canvas id="clicks-chart"></canvas>
            </div>
        `;

        const dateFilter = document.getElementById('date-filter');
        const campaignFilter = document.getElementById('campaign-filter');

        const updateAnalyticsCharts = (analyticsData) => {
            // Clear previous charts
            const visitsChartCanvas = document.getElementById('visits-chart');
            const clicksChartCanvas = document.getElementById('clicks-chart');
            if (visitsChartCanvas.chart) visitsChartCanvas.chart.destroy();
            if (clicksChartCanvas.chart) clicksChartCanvas.chart.destroy();

            const totalVisits = analyticsData.visits.length;
            const totalClicks = analyticsData.clicks.length;
            const abandonedVisits = totalVisits - new Set(analyticsData.clicks.map(c => c.ip)).size;

            visitsChartCanvas.chart = new Chart(visitsChartCanvas, {
                type: 'bar',
                data: {
                    labels: ['Visitor Engagement'],
                    datasets: [
                        {
                            label: `Followed Link (${totalClicks} - ${totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : 0}%)`,
                            data: [totalClicks],
                            backgroundColor: '#36a2eb'
                        },
                        {
                            label: `Abandoned (${abandonedVisits} - ${totalVisits > 0 ? ((abandonedVisits / totalVisits) * 100).toFixed(1) : 0}%)`,
                            data: [abandonedVisits],
                            backgroundColor: '#ff6384'
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    scales: { x: { stacked: true }, y: { stacked: true } }
                }
            });

            const clicksPerLink = {};
            analyticsData.clicks.forEach(click => {
                clicksPerLink[click.linkId] = (clicksPerLink[click.linkId] || 0) + 1;
            });

            const sortedLinks = Object.entries(clicksPerLink).sort(([,a],[,b]) => b-a);
            const linkLabels = sortedLinks.map(([linkId]) => config.links.find(l => l.id === linkId)?.text || 'Unknown Link');
            const clickCounts = sortedLinks.map(([,count]) => count);

            clicksChartCanvas.chart = new Chart(clicksChartCanvas, {
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
                    indexAxis: 'y',
                    responsive: true,
                }
            });
        };

        const filterAnalyticsData = (analytics) => {
            const selectedDateFilter = dateFilter.value;
            const selectedCampaignFilter = campaignFilter.value;

            let filteredAnalytics = { visits: [...analytics.visits], clicks: [...analytics.clicks] };

            // Filter by date
            const now = new Date();
            let startDate = new Date();
            if (selectedDateFilter === 'all') {
                startDate = new Date(0);
            } else if (selectedDateFilter === 'yesterday') {
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate.setDate(now.getDate() - parseInt(selectedDateFilter));
            }
            
            filteredAnalytics.visits = filteredAnalytics.visits.filter(v => new Date(v.timestamp) >= startDate);
            filteredAnalytics.clicks = filteredAnalytics.clicks.filter(c => new Date(c.timestamp) >= startDate);

            // Populate campaign filter based on date filter
            campaignFilter.innerHTML = '<option value="all">All Campaigns</option>';
            config.campaigns.forEach(c => {
                if (new Date(c.endDate) >= startDate) {
                    campaignFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                }
            });
            campaignFilter.value = selectedCampaignFilter;

            // Filter by campaign
            if (selectedCampaignFilter !== 'all') {
                const campaign = config.campaigns.find(c => c.id === selectedCampaignFilter);
                if (campaign) {
                    const campaignStart = new Date(campaign.startDate);
                    const campaignEnd = new Date(campaign.endDate);
                    filteredAnalytics.visits = filteredAnalytics.visits.filter(v => new Date(v.timestamp) >= campaignStart && new Date(v.timestamp) <= campaignEnd);
                    filteredAnalytics.clicks = filteredAnalytics.clicks.filter(c => new Date(c.timestamp) >= campaignStart && new Date(c.timestamp) <= campaignEnd);
                }
            }

            updateAnalyticsCharts(filteredAnalytics);
        };

        fetch('/api/analytics')
            .then(response => response.json())
            .then(analytics => {
                dateFilter.addEventListener('change', () => filterAnalyticsData(analytics));
                campaignFilter.addEventListener('change', () => filterAnalyticsData(analytics));
                filterAnalyticsData(analytics); // Initial load
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