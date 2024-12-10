const resultsDiv = document.getElementById('testResults');
const statusDiv = document.getElementById('status');
const spinner = document.getElementById('spinner');
const resultChartCanvas = document.getElementById('resultChart');
let chart;
let historicalData = JSON.parse(localStorage.getItem('performanceData')) || [];

function initializeChart() {
    const ctx = resultChartCanvas.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Current Session',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.3,
            }, {
                label: 'Historical Average',
                data: historicalData.map(d => d.time),
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                tension: 0.3,
            }],
        },
        options: {
            responsive: true,
            animation: { duration: 1000, easing: 'easeInOutQuad' },
            scales: {
                x: { title: { display: true, text: 'Operation Type' }},
                y: { 
                    title: { display: true, text: 'Time (ms)' },
                    beginAtZero: true,
                    logarithmic: true
                }
            },
            plugins: {
                tooltip: { mode: 'index', intersect: false },
                zoom: { pan: { enabled: true }, zoom: { wheel: { enabled: true }}}
            }
        }
    });
}

async function runTest(testFunc, testName) {
    statusDiv.textContent = `${testName} in progress...`;
    spinner.style.display = 'block';
    resultsDiv.innerHTML = '';

    const metrics = { start: performance.now() };
    const memoryStart = performance.memory?.usedJSHeapSize;
    
    try {
        const details = await testFunc();
        metrics.end = performance.now();
        const executionTime = (metrics.end - metrics.start).toFixed(2);
        const memoryUsed = performance.memory ? 
            ((performance.memory.usedJSHeapSize - memoryStart) / 1048576).toFixed(2) + ' MB' : 
            'Not available';

        statusDiv.textContent = `${testName} completed in ${executionTime} ms`;
        updateChart(testName, executionTime);
        savePerformanceData(testName, executionTime);

        resultsDiv.innerHTML = `
            ${details}
            <p>Execution Time: ${executionTime} ms</p>
            <p>Memory Usage: ${memoryUsed}</p>
        `;
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    } finally {
        spinner.style.display = 'none';
    }
}

async function cpuIntensiveTask() {
    const imageSize = 2000;
    const imageData = new Uint8ClampedArray(imageSize * imageSize * 4);
    
    for(let i = 0; i < imageData.length; i += 4) {
        imageData[i] = Math.random() * 255;     // R
        imageData[i + 1] = Math.random() * 255; // G
        imageData[i + 2] = Math.random() * 255; // B
        imageData[i + 3] = 255;                 // A
    }
    
    const filters = [
        () => {
            for(let i = 0; i < imageData.length; i += 4) {
                const avg = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
                imageData[i] = imageData[i + 1] = imageData[i + 2] = avg;
            }
        },
        () => {
            const factor = 1.2;
            for(let i = 0; i < imageData.length; i += 4) {
                imageData[i] *= factor;
                imageData[i + 1] *= factor;
                imageData[i + 2] *= factor;
            }
        },
        () => {
            for(let i = 0; i < imageData.length; i += 4) {
                imageData[i] = 255 - imageData[i];
                imageData[i + 1] = 255 - imageData[i + 1];
                imageData[i + 2] = 255 - imageData[i + 2];
            }
        }
    ];
    
    filters.forEach(filter => filter());
    
    return `
        <p>Image Processing Results:</p>
        <ul>
            <li>Image Size: ${imageSize}x${imageSize}</li>
            <li>Pixels Processed: ${(imageSize * imageSize).toLocaleString()}</li>
            <li>Filters Applied: ${filters.length}</li>
        </ul>
    `;
}

async function memoryOperation() {
    const records = [];
    const recordCount = 1000000;
    
    for(let i = 0; i < recordCount; i++) {
        records.push({
            id: i,
            timestamp: Date.now(),
            data: {
                values: Array(20).fill().map(() => Math.random()),
                metadata: {
                    type: ['user', 'system', 'network'][i % 3],
                    priority: Math.floor(Math.random() * 5),
                    tags: Array(5).fill().map(() => 
                        Math.random().toString(36).substring(7)
                    )
                }
            }
        });
    }
    
    const aggregated = records.reduce((acc, record) => {
        const type = record.data.metadata.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(record);
        return acc;
    }, {});
    
    const stats = Object.entries(aggregated).map(([type, items]) => ({
        type,
        count: items.length,
        avgPriority: items.reduce((sum, item) => 
            sum + item.data.metadata.priority, 0) / items.length
    }));
    
    return `
        <p>Data Processing Results:</p>
        <ul>
            <li>Records Processed: ${recordCount.toLocaleString()}</li>
            <li>Categories: ${stats.length}</li>
            ${stats.map(s => 
                `<li>${s.type}: ${s.count} records (Avg Priority: ${s.avgPriority.toFixed(2)})</li>`
            ).join('')}
        </ul>
    `;
}

async function networkOperation() {
    const endpoints = [
        'https://api.github.com/repos/microsoft/vscode',
        'https://api.github.com/repos/facebook/react',
        'https://api.github.com/repos/tensorflow/tensorflow',
        'https://api.github.com/repos/kubernetes/kubernetes'
    ];
    
    const requests = endpoints.map(async url => {
        const start = performance.now();
        try {
            const response = await fetch(url);
            const data = await response.json();
            return {
                url,
                success: true,
                time: performance.now() - start,
                stars: data.stargazers_count,
                forks: data.forks_count
            };
        } catch (error) {
            return {
                url,
                success: false,
                time: performance.now() - start,
                error: error.message
            };
        }
    });
    
    const results = await Promise.all(requests);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgTime = successful.reduce((acc, r) => acc + r.time, 0) / successful.length;
    
    return `
        <p>Network Operations Results:</p>
        <ul>
            <li>Total Requests: ${results.length}</li>
            <li>Successful: ${successful.length}</li>
            <li>Failed: ${failed.length}</li>
            <li>Average Response Time: ${avgTime.toFixed(2)}ms</li>
            ${successful.map(r => `
                <li>${new URL(r.url).pathname}:
                    ${r.stars.toLocaleString()} stars,
                    ${r.forks.toLocaleString()} forks
                </li>
            `).join('')}
        </ul>
    `;
}

async function graphicsOperation() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const gl = canvas.getContext('webgl2');
    
    if (!gl) throw new Error('WebGL2 not supported');
    
    const vertexCount = 100000;
    const vertices = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 4);
    
    for(let i = 0; i < vertexCount * 3; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random();
        
        vertices[i] = r * Math.sin(phi) * Math.cos(theta);
        vertices[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        vertices[i + 2] = r * Math.cos(phi);
    }
    
    for(let i = 0; i < vertexCount * 4; i += 4) {
        colors[i] = Math.random();
        colors[i + 1] = Math.random();
        colors[i + 2] = Math.random();
        colors[i + 3] = 1.0;
    }
    
    const vertexBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    
    return `
        <p>Graphics Processing Results:</p>
        <ul>
            <li>Resolution: ${canvas.width}x${canvas.height}</li>
            <li>Vertices: ${vertexCount.toLocaleString()}</li>
            <li>Buffer Size: ${((vertices.byteLength + colors.byteLength) / 1048576).toFixed(2)} MB</li>
        </ul>
    `;
}

async function storageOperation() {
    const data = {
        settings: Array(1000).fill().map((_, i) => ({
            id: `setting_${i}`,
            value: Math.random(),
            enabled: Math.random() > 0.5,
            timestamp: Date.now(),
            metadata: {
                category: ['system', 'user', 'network', 'security'][i % 4],
                priority: Math.floor(Math.random() * 5),
                tags: Array(3).fill().map(() => Math.random().toString(36).substr(2))
            }
        }))
    };
    
    const storageKey = 'app_settings';
    const serialized = JSON.stringify(data);
    const compressionRatio = serialized.length / JSON.stringify(data.settings).length;
    
    try {
        localStorage.setItem(storageKey, serialized);
        const retrieved = JSON.parse(localStorage.getItem(storageKey));
        localStorage.removeItem(storageKey);
        
        return `
            <p>Storage Operations Results:</p>
            <ul>
                <li>Records: ${data.settings.length}</li>
                <li>Data Size: ${(serialized.length / 1024).toFixed(2)} KB</li>
                <li>Compression Ratio: ${compressionRatio.toFixed(2)}</li>
                <li>Categories: ${new Set(data.settings.map(s => s.metadata.category)).size}</li>
            </ul>
        `;
    } catch (error) {
        throw new Error(`Storage operation failed: ${error.message}`);
    }
}

function updateChart(testName, executionTime) {
    if (chart) {
        chart.data.labels.push(testName);
        chart.data.datasets[0].data.push(executionTime);
        
        chart.data.datasets[1].data = chart.data.labels.map(label => 
            historicalData
                .filter(d => d.test === label)
                .reduce((acc, curr) => acc + curr.time, 0) / 
                historicalData.filter(d => d.test === label).length || 0
        );
        
        chart.update();
    }
}

function savePerformanceData(testName, executionTime) {
    historicalData.push({
        test: testName,
        time: executionTime,
        timestamp: Date.now()
    });
    
    const maxEntriesPerTest = 100;
    const tests = [...new Set(historicalData.map(d => d.test))];
    
    historicalData = tests.flatMap(test => 
        historicalData
            .filter(d => d.test === test)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, maxEntriesPerTest)
    );
    
    localStorage.setItem('performanceData', JSON.stringify(historicalData));
}

document.getElementById('cpuTest').addEventListener('click', () => 
    runTest(cpuIntensiveTask, 'CPU Processing'));

document.getElementById('memoryTest').addEventListener('click', () => 
    runTest(memoryOperation, 'Memory Operations'));

document.getElementById('networkTest').addEventListener('click', () => 
    runTest(networkOperation, 'Network Operations'));

document.getElementById('webglTest').addEventListener('click', () => 
    runTest(graphicsOperation, 'Graphics Processing'));

document.getElementById('storageTest').addEventListener('click', () => 
    runTest(storageOperation, 'Storage Operations'));

document.getElementById('domTest').addEventListener('click', () => 
    runTest(domOperation, 'DOM Operations'));

document.getElementById('fpsTest').addEventListener('click', () => 
    runTest(fpsOperation, 'FPS Benchmark'));

document.getElementById('indexedDbTest').addEventListener('click', () => 
    runTest(indexedDbOperation, 'IndexedDB Operations'));

document.getElementById('workerTest').addEventListener('click', () => 
    runTest(workerOperation, 'Worker Threading'));

document.getElementById('animationTest').addEventListener('click', () => 
    runTest(animationOperation, 'Animation Performance'));

async function domOperation() {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;';
    document.body.appendChild(container);
    
    const operations = {
        created: 0,
        modified: 0,
        deleted: 0
    };

    for(let i = 0; i < 5000; i++) {
        const elem = document.createElement('div');
        elem.innerHTML = `
            <article class="card">
                <header>
                    <h2>Item ${i}</h2>
                    <nav>
                        <ul>
                            <li><a href="#">Link 1</a></li>
                            <li><a href="#">Link 2</a></li>
                        </ul>
                    </nav>
                </header>
                <section>
                    <p>Content ${i}</p>
                    <div class="nested">
                        <span>Nested content</span>
                    </div>
                </section>
            </article>
        `;
        container.appendChild(elem);
        operations.created++;
    }

    const elements = container.getElementsByTagName('*');
    for(let i = 0; i < elements.length; i++) {
        if(i % 2 === 0) {
            elements[i].className = 'modified';
            elements[i].style.cssText = `
                color: rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255});
                transform: scale(${0.8 + Math.random()*0.4});
            `;
            operations.modified++;
        }
    }

    const toRemove = container.querySelectorAll('.modified');
    toRemove.forEach(elem => {
        elem.remove();
        operations.deleted++;
    });

    document.body.removeChild(container);
    
    return `
        <p>DOM Operations Results:</p>
        <ul>
            <li>Elements Created: ${operations.created}</li>
            <li>Elements Modified: ${operations.modified}</li>
            <li>Elements Deleted: ${operations.deleted}</li>
        </ul>
    `;
}

async function fpsOperation() {
    return new Promise((resolve) => {
        const duration = 5000; 
        const frames = [];
        let lastTime = performance.now();
        let animationId;

        function renderFrame(currentTime) {
            const deltaTime = currentTime - lastTime;
            frames.push(1000 / deltaTime); 
            lastTime = currentTime;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 500;
            canvas.height = 500;

            for(let i = 0; i < 100; i++) {
                ctx.beginPath();
                ctx.arc(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    Math.random() * 50,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
                ctx.fill();
            }

            if(currentTime - frames[0] < duration) {
                animationId = requestAnimationFrame(renderFrame);
            } else {
                cancelAnimationFrame(animationId);
                const avgFps = frames.reduce((a, b) => a + b) / frames.length;
                resolve(`
                    <p>FPS Benchmark Results:</p>
                    <ul>
                        <li>Average FPS: ${avgFps.toFixed(2)}</li>
                        <li>Min FPS: ${Math.min(...frames).toFixed(2)}</li>
                        <li>Max FPS: ${Math.max(...frames).toFixed(2)}</li>
                        <li>Frames Recorded: ${frames.length}</li>
                    </ul>
                `);
            }
        }

        animationId = requestAnimationFrame(renderFrame);
    });
}

async function indexedDbOperation() {
    const dbName = 'BenchmarkDB';
    const storeName = 'testStore';
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => reject(new Error('IndexedDB access denied'));
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };
        
        request.onsuccess = async (event) => {
            const db = event.target.result;
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            
            const operations = {
                written: 0,
                read: 0,
                deleted: 0
            };

            for(let i = 0; i < 10000; i++) {
                await store.put({
                    id: i,
                    data: {
                        timestamp: Date.now(),
                        value: Math.random(),
                        array: Array(100).fill().map(() => Math.random())
                    }
                });
                operations.written++;
            }

            for(let i = 0; i < 1000; i++) {
                await store.get(Math.floor(Math.random() * 10000));
                operations.read++;
            }

            for(let i = 0; i < 5000; i++) {
                await store.delete(i);
                operations.deleted++;
            }

            resolve(`
                <p>IndexedDB Operations Results:</p>
                <ul>
                    <li>Records Written: ${operations.written}</li>
                    <li>Records Read: ${operations.read}</li>
                    <li>Records Deleted: ${operations.deleted}</li>
                </ul>
            `);
        };
    });
}

async function workerOperation() {
    const workerCount = navigator.hardwareConcurrency || 4;
    const workersCode = `
        self.onmessage = function(e) {
            const iterations = e.data;
            let result = 0;
            
            for(let i = 0; i < iterations; i++) {
                result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
                // Simulate complex calculations
                for(let j = 0; j < 1000; j++) {
                    result += Math.tan(j) / (1 + Math.random());
                }
            }
            
            self.postMessage(result);
        };
    `;

    return new Promise((resolve) => {
        const workers = [];
        const results = [];
        let completed = 0;

        for(let i = 0; i < workerCount; i++) {
            const blob = new Blob([workersCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            
            worker.onmessage = (e) => {
                results.push(e.data);
                completed++;
                
                if(completed === workerCount) {
                    workers.forEach(w => w.terminate());
                    resolve(`
                        <p>Worker Threading Results:</p>
                        <ul>
                            <li>Workers Used: ${workerCount}</li>
                            <li>Calculations Per Worker: 1e6</li>
                            <li>Total Calculations: ${(workerCount * 1e6).toLocaleString()}</li>
                            <li>Average Result: ${(results.reduce((a, b) => a + b) / results.length).toFixed(2)}</li>
                        </ul>
                    `);
                }
            };
            
            workers.push(worker);
            worker.postMessage(1e6); 
        }
    });
}

async function animationOperation() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    const particles = Array(1000).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 4 - 2,
        radius: Math.random() * 10 + 2,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }));

    return new Promise((resolve) => {
        let frames = 0;
        const maxFrames = 300; 
        
        function animate() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                
                if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            });
            
            frames++;
            
            if(frames < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                resolve(`
                    <p>Animation Performance Results:</p>
                    <ul>
                        <li>Particles Animated: ${particles.length}</li>
                        <li>Frames Rendered: ${frames}</li>
                        <li>Target FPS: 999999</li>
                        <li>Actual FPS: ${(frames / 5).toFixed(2)}</li>
                    </ul>
                `);
            }
        }
        
        animate();
    });
}
async function sortOperation() {
    const arraySize = 1000000;
    const results = {
        numeric: 0,
        string: 0,
        object: 0
    };
    
    const numbers = Array(arraySize).fill().map(() => Math.random() * 10000);
    const numStart = performance.now();
    numbers.sort((a, b) => a - b);
    results.numeric = performance.now() - numStart;
    
    const strings = Array(arraySize).fill().map(() => 
        Math.random().toString(36).substring(7));
    const strStart = performance.now();
    strings.sort();
    results.string = performance.now() - strStart;
    
    const objects = Array(arraySize).fill().map(() => ({
        id: Math.random() * 10000,
        value: Math.random().toString(36).substring(7),
        priority: Math.floor(Math.random() * 100)
    }));
    const objStart = performance.now();
    objects.sort((a, b) => a.priority - b.priority);
    results.object = performance.now() - objStart;
    
    return `
        <p>Sort Performance Results:</p>
        <ul>
            <li>Array Size: ${arraySize.toLocaleString()}</li>
            <li>Numeric Sort: ${results.numeric.toFixed(2)}ms</li>
            <li>String Sort: ${results.string.toFixed(2)}ms</li>
            <li>Object Sort: ${results.object.toFixed(2)}ms</li>
        </ul>
    `;
}

async function jsonOperation() {
    const iterations = 10000;
    const results = {
        stringify: 0,
        parse: 0
    };
    
    const complexObject = {
        id: 1,
        timestamp: Date.now(),
        data: Array(1000).fill().map(() => ({
            id: Math.random(),
            values: Array(50).fill().map(() => Math.random()),
            metadata: {
                type: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
                tags: Array(5).fill().map(() => Math.random().toString(36).substring(7))
            }
        }))
    };
    
    const stringifyStart = performance.now();
    for(let i = 0; i < iterations; i++) {
        JSON.stringify(complexObject);
    }
    results.stringify = performance.now() - stringifyStart;
    
    const jsonString = JSON.stringify(complexObject);
    const parseStart = performance.now();
    for(let i = 0; i < iterations; i++) {
        JSON.parse(jsonString);
    }
    results.parse = performance.now() - parseStart;
    
    return `
        <p>JSON Operations Results:</p>
        <ul>
            <li>Iterations: ${iterations.toLocaleString()}</li>
            <li>Object Size: ${jsonString.length.toLocaleString()} bytes</li>
            <li>Stringify Time: ${results.stringify.toFixed(2)}ms</li>
            <li>Parse Time: ${results.parse.toFixed(2)}ms</li>
        </ul>
    `;
}

async function canvasStressOperation() {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    
    const operations = {
        shapes: 0,
        pixels: 0,
        gradients: 0
    };
    
    for(let i = 0; i < 10000; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        for(let j = 0; j < 5; j++) {
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
        ctx.fill();
        operations.shapes++;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for(let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = imageData.data[i] ^ 255;     // R
        imageData.data[i + 1] = imageData.data[i + 1] ^ 255; // G
        imageData.data[i + 2] = imageData.data[i + 2] ^ 255; // B
        operations.pixels++;
    }
    ctx.putImageData(imageData, 0, 0);
    
    for(let i = 0; i < 100; i++) {
        const gradient = ctx.createRadialGradient(
            Math.random() * canvas.width, Math.random() * canvas.height, 0,
            Math.random() * canvas.width, Math.random() * canvas.height, 
            Math.random() * 500
        );
        gradient.addColorStop(0, `hsl(${Math.random()*360},100%,50%)`);
        gradient.addColorStop(0.5, `hsl(${Math.random()*360},100%,50%)`);
        gradient.addColorStop(1, `hsl(${Math.random()*360},100%,50%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        operations.gradients++;
    }
    
    return `
        <p>Canvas Stress Test Results:</p>
        <ul>
            <li>Canvas Size: ${canvas.width}x${canvas.height}</li>
            <li>Shapes Drawn: ${operations.shapes.toLocaleString()}</li>
            <li>Pixels Processed: ${operations.pixels.toLocaleString()}</li>
            <li>Gradients Applied: ${operations.gradients}</li>
        </ul>
    `;
}

async function renderingOperation() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    const operations = {
        elements: 0,
        styles: 0,
        layouts: 0
    };
    
    for(let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="card" style="transform: rotate(${Math.random()*360}deg)">
                <header style="backdrop-filter: blur(5px)">
                    <h2>Item ${i}</h2>
                </header>
                <section class="content">
                    ${Array(10).fill().map(() => `
                        <p style="transform: scale(${0.8 + Math.random()*0.4})">
                            ${Math.random().toString(36).substring(7)}
                        </p>
                    `).join('')}
                </section>
                <footer style="opacity: ${Math.random()}">
                    ${Array(5).fill().map(() => `
                        <button style="transform: translateZ(${Math.random()*50}px)">
                            Action
                        </button>
                    `).join('')}
                </footer>
            </div>
        `;
        container.appendChild(div);
        operations.elements++;
        
        div.getBoundingClientRect();
        operations.layouts++;
        
        const elements = div.getElementsByTagName('*');
        for(let el of elements) {
            el.style.cssText += `
                transition: all 0.3s ease;
                box-shadow: ${Math.random()*10}px ${Math.random()*10}px ${Math.random()*20}px rgba(0,0,0,0.3);
                border-radius: ${Math.random()*20}px;
            `;
            operations.styles++;
        }
    }
    
    document.body.removeChild(container);
    
    return `
        <p>Rendering Performance Results:</p>
        <ul>
            <li>Elements Created: ${operations.elements.toLocaleString()}</li>
            <li>Styles Applied: ${operations.styles.toLocaleString()}</li>
            <li>Layout Recalculations: ${operations.layouts.toLocaleString()}</li>
        </ul>
    `;
}

initializeChart();

setInterval(() => {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    historicalData = historicalData.filter(d => d.timestamp > oneMonthAgo);
    localStorage.setItem('performanceData', JSON.stringify(historicalData));
}, 24 * 60 * 60 * 1000); 
