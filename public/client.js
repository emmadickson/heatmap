document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('toggleButton');
    const itemListInput = document.getElementById('itemList');
    const startUrlInput = document.getElementById('startUrl');
    const maxUrlsInput = document.getElementById('maxUrls');
    const colorInput = document.getElementById('colorPicker');
    const resultDiv = document.getElementById('result');

    toggleButton.addEventListener('click', async function () {
        // Reset the result message and graph at the start
        resultDiv.textContent = 'Crawling in progress...';
        document.getElementById('graph').innerHTML = '';

        const startUrl = startUrlInput.value;
        if (!startUrl) {
            alert('Please enter a starting URL');
            return;
        }

        try {
            const requestData = {
                startUrl: startUrl,
                maxUrls: parseInt(maxUrlsInput.value) || 100,
                highlightElements: itemListInput.value.split(',').map(item => item.trim()),
                highlightColor: colorInput.value,
                exportData: true
            };

            console.log('Sending request:', requestData);

            const response = await fetch('/crawl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received response:', data);

            resultDiv.textContent = data.message;
            console.log("SDFSDLFJSDLFKJSLKDFSDF");
            // Extract domain from startUrl and call visualization
            const domain = new URL(startUrl).hostname;
            console.log("\nTrying for domain: ", domain)
            await visualizeSiteStructure(domain);
        } catch (error) {
            console.error('Error:', error);
            resultDiv.textContent = 'Error: ' + error.message;
        }
    });

    // Color picker change handler
    colorInput.addEventListener('change', function() {
        fetch('/api/updateColor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ color: this.value }),
        });
    });

    // Item list event handler
    itemListInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const itemList = this.value.split(',').map(item => item.trim());
            fetch('/api/updateItems', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itemList: itemList }),
            });
        }
    });
});
