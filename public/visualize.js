async function visualizeSiteStructure(domain) {
    // Clear any existing visualization
    d3.select('#graph').html('');

    try {
        const structureUrl = `/crawls/${domain}/structure.json`;
        console.log(`Fetching structure from: ${structureUrl}`);

        const response = await fetch(structureUrl);

        if (!response.ok) {
            throw new Error(`Failed to load site structure (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        if (!data) {
            throw new Error('No data received from server');
        }

      

        console.log('Received structure data:', data);

        const width = window.innerWidth;
        const height = window.innerHeight;

        const svg = d3.select('#graph')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(200))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2));

        function flatten(node, parent = null, nodes = [], links = []) {
            const id = nodes.length;
            nodes.push({ ...node, id });
            if (parent !== null) {
                links.push({ source: parent, target: id });
            }
            if (node.children) {
                node.children.forEach(child => flatten(child, id, nodes, links));
            }
            return { nodes, links };
        }

        const { nodes, links } = flatten(data);
        console.log('Processed nodes:', nodes.length);
        console.log('Processed links:', links.length);

        // Create links
        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2);

        // Create nodes with screenshots
        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter().append('g');

        // Add screenshot images
        node.append('image')
            .attr('xlink:href', d => {
                console.log('Screenshot path:', d.screenshot);
                return d.screenshot || '/placeholder.png';
            })
            .attr('width', 100)
            .attr('height', 75)
            .on('error', function() {
                console.log('Image failed to load, replacing with rectangle');
                const parent = d3.select(this.parentNode);
                this.remove();
                parent.append('rect')
                    .attr('width', 100)
                    .attr('height', 75)
                    .attr('fill', '#ddd');
            });

        // Add URL labels
        node.append('text')
            .attr('dy', 85)
            .attr('text-anchor', 'middle')
            .text(d => {
                try {
                    return new URL(d.url).pathname || '/';
                } catch (e) {
                    console.error('Error parsing URL:', d.url);
                    return '/';
                }
            })
            .attr('font-size', '8px');

        // Enable drag behavior
        node.call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

        simulation
            .nodes(nodes)
            .on('tick', ticked);

        simulation.force('link')
            .links(links);

        function ticked() {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x - 50},${d.y - 37.5})`);
        }

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
    } catch (error) {
        console.error('Visualization error:', error);
        document.getElementById('graph').textContent = 'Error loading visualization: ' + error.message;
    }
}
