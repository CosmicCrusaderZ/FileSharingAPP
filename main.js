// FileSync - Real-time File Sharing App
// Main JavaScript File

// Global Variables
let peer;
let connections = {};
let currentRoom = null;
let roomPassword = null;
let encryptionEnabled = true;
let darkMode = false;
let username = `User${Math.floor(Math.random() * 10000)}`;
let transferQueue = [];
let transfers = {};
let currentWhiteboardTool = 'pen';
let whiteboardColor = '#000000';
let isDrawing = false;
let collaborativeText = '';
let lastDrawPoint;
let canvas, ctx;

// DOM Elements
const elements = {
    // UI Toggles
    themeSwitch: document.getElementById('theme-switch'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    encryptionToggle: document.getElementById('encryption-toggle'),
    notificationsToggle: document.getElementById('notifications-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    
    // Room Controls
    roomId: document.getElementById('room-id'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    joinConfirmBtn: document.getElementById('join-confirm-btn'),
    roomInput: document.getElementById('room-input'),
    peerCount: document.getElementById('peer-count'),
    peerList: document.getElementById('peer-list'),
    
    // Transfer Elements
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('file-input'),
    transferList: document.getElementById('transfer-list'),
    transferFilters: document.querySelectorAll('.filters span'),
    
    // Collaboration Panel
    collabPanel: document.getElementById('collab-panel'),
    closeCollabBtn: document.getElementById('close-collab-btn'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    whiteboard: document.getElementById('whiteboard'),
    whiteboardTools: document.querySelectorAll('.tool-btn'),
    colorPicker: document.getElementById('color-picker'),
    textEditor: document.getElementById('text-editor'),
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendMessageBtn: document.getElementById('send-message-btn'),
    
    // Modals
    settingsModal: document.getElementById('settings-modal'),
    previewModal: document.getElementById('preview-modal'),
    closeModalBtns: document.querySelectorAll('.close-modal'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    resetSettingsBtn: document.getElementById('reset-settings-btn'),
    previewFilename: document.getElementById('preview-filename'),
    previewContainer: document.getElementById('preview-container'),
    previewDownloadBtn: document.getElementById('preview-download-btn'),
    
    // Other Elements
    toastContainer: document.getElementById('toast-container'),
    searchBar: document.querySelector('.search-bar input')
};

// Initialize App
function initApp() {
    // Initialize PeerJS
    initPeerConnection();
    
    // Setup Event Listeners
    setupEventListeners();
    
    // Initialize Whiteboard
    initWhiteboard();
    
    // Load Settings
    loadSettings();
    
    // Setup File Drop Area
    setupDropArea();
}

// Initialize PeerJS Connection
function initPeerConnection() {
    // Create a random ID for this peer
    const peerId = generateId(12);
    
    // Initialize the Peer object
    peer = new Peer(peerId, {
        debug: 2
        // Using default PeerJS server - no custom host needed
    });
    
    // Handle peer connection open
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        showToast('info', 'Connection Ready', 'Your connection is ready. Create or join a room to start sharing files.');
    });
    
    // Handle incoming connections
    peer.on('connection', (conn) => {
        handleConnection(conn);
    });
    
    // Handle errors
    peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        showToast('error', 'Connection Error', err.message);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme Toggle
    elements.themeSwitch.addEventListener('change', toggleTheme);
    elements.darkModeToggle.addEventListener('change', toggleTheme);
    
    // Room Controls
    elements.createRoomBtn.addEventListener('click', createRoom);
    elements.joinRoomBtn.addEventListener('click', () => {
        elements.roomInput.parentElement.classList.toggle('active');
    });
    elements.joinConfirmBtn.addEventListener('click', joinRoom);
    elements.roomInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    // File Input
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Transfer Filters
    elements.transferFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            elements.transferFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            filterTransfers(filter.textContent.toLowerCase());
        });
    });
    
    // Collaboration Panel
    elements.closeCollabBtn.addEventListener('click', () => {
        elements.collabPanel.classList.add('hidden');
    });
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar nav li').forEach((item, index) => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items
            document.querySelectorAll('.sidebar nav li').forEach(navItem => {
                navItem.classList.remove('active');
            });
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Handle specific nav items
            switch(index) {
                case 0: // Home
                    elements.collabPanel.classList.add('hidden');
                    break;
                case 1: // Recent
                    showToast('info', 'Recent Files', 'Showing your recent files');
                    elements.collabPanel.classList.add('hidden');
                    break;
                case 2: // Favorites
                    showToast('info', 'Favorites', 'Showing your favorite files');
                    elements.collabPanel.classList.add('hidden');
                    break;
                case 3: // Shared - Show collab panel
                    elements.collabPanel.classList.remove('hidden');
                    activateTab(elements.tabs[0]); // Activate first tab
                    break;
                case 4: // Settings
                    elements.settingsModal.classList.add('active');
                    break;
            }
        });
    });
    
    // Search bar functionality
    elements.searchBar.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = elements.searchBar.value.trim().toLowerCase();
            if (searchTerm) {
                showToast('info', 'Search Results', `Searching for "${searchTerm}"`);
                // In a real app, implement actual search functionality
            }
        }
    });
    
    // Notifications click handler
    document.querySelector('.notifications').addEventListener('click', () => {
        showToast('info', 'Notifications', 'You have 3 new notifications');
        // Clear notification badge after clicking
        document.querySelector('.badge').style.display = 'none';
    });
    
    // User profile click handler
    document.querySelector('.user').addEventListener('click', () => {
        elements.settingsModal.classList.add('active');
    });
    
    // Tabs
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activateTab(tab);
        });
    });
    
    // Whiteboard Tools
    elements.whiteboardTools.forEach(tool => {
        tool.addEventListener('click', () => {
            elements.whiteboardTools.forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentWhiteboardTool = tool.getAttribute('data-tool');
            
            if (currentWhiteboardTool === 'clear') {
                clearWhiteboard();
                // Reset to pen after clearing
                setTimeout(() => {
                    elements.whiteboardTools[0].click();
                }, 100);
            }
        });
    });
    
    // Color Picker
    elements.colorPicker.addEventListener('input', (e) => {
        whiteboardColor = e.target.value;
    });
    
    // Text Editor
    elements.textEditor.addEventListener('input', (e) => {
        collaborativeText = e.target.innerHTML;
        broadcastTextEditorChanges();
    });
    
    // Chat
    elements.messageInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    elements.sendMessageBtn.addEventListener('click', sendChatMessage);
    
    // Close Modals
    elements.closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Settings Modal
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Language select
    document.getElementById('language-select').addEventListener('change', (e) => {
        showToast('info', 'Language Changed', `Language set to ${e.target.options[e.target.selectedIndex].text}`);
    });
    
    // Expiration select
    document.getElementById('expiration-select').addEventListener('change', (e) => {
        showToast('info', 'Expiration Changed', `File expiration set to ${e.target.options[e.target.selectedIndex].text}`);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Esc to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        
        // Ctrl+B to toggle collaboration panel
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            elements.collabPanel.classList.toggle('hidden');
        }
    });
}

// Room Functions
function createRoom() {
    if (currentRoom) {
        leaveRoom();
    }
    
    const roomId = generateId(6);
    elements.roomId.textContent = roomId;
    currentRoom = roomId;
    
    // Register as the room host in Firebase or similar service
    // For demo purposes, we'll use localStorage as a simple registry
    const roomRegistry = JSON.parse(localStorage.getItem('fileShareRooms') || '{}');
    roomRegistry[roomId] = {
        host: peer.id,
        created: Date.now(),
        peers: [peer.id]
    };
    localStorage.setItem('fileShareRooms', JSON.stringify(roomRegistry));
    
    showToast('success', 'Room Created', `Room ${roomId} created. Share this ID with others to let them join.`);
    
    // Update UI
    updateRoomUI();
}

function joinRoom() {
    const roomId = elements.roomInput.value.trim();
    
    if (!roomId) {
        showToast('error', 'Invalid Room ID', 'Please enter a valid room ID');
        return;
    }
    
    if (currentRoom) {
        leaveRoom();
    }
    
    // Check if room exists in registry
    const roomRegistry = JSON.parse(localStorage.getItem('fileShareRooms') || '{}');
    const room = roomRegistry[roomId];
    
    if (!room) {
        // Create room if it doesn't exist
        showToast('warning', 'Room Not Found', 'Creating new room instead');
        createRoom();
        return;
    }
    
    currentRoom = roomId;
    elements.roomId.textContent = roomId;
    
    // Connect to all peers in the room
    if (room.peers && room.peers.length > 0) {
        room.peers.forEach(peerId => {
            if (peerId !== peer.id) {
                connectToPeer(peerId);
            }
        });
    }
    
    // Add self to room
    room.peers = [...new Set([...room.peers, peer.id])]; // Ensure unique peer IDs
    roomRegistry[roomId] = room;
    localStorage.setItem('fileShareRooms', JSON.stringify(roomRegistry));
    
    // Update UI
    elements.roomInput.value = '';
    elements.roomInput.parentElement.classList.remove('active');
    updateRoomUI();
    
    showToast('info', 'Joining Room', `Connected to room ${roomId}`);
}

function leaveRoom() {
    if (!currentRoom) return;
    
    // Remove self from room registry
    const roomRegistry = JSON.parse(localStorage.getItem('fileShareRooms') || '{}');
    if (roomRegistry[currentRoom]) {
        roomRegistry[currentRoom].peers = roomRegistry[currentRoom].peers.filter(id => id !== peer.id);
        
        // Clean up empty rooms
        if (roomRegistry[currentRoom].peers.length === 0) {
            delete roomRegistry[currentRoom];
        }
        
        localStorage.setItem('fileShareRooms', JSON.stringify(roomRegistry));
    }
    
    // Notify peers that we're leaving
    Object.values(connections).forEach(conn => {
        try {
            conn.send({
                type: 'system',
                action: 'leave',
                roomId: currentRoom,
                peerId: peer.id,
                timestamp: Date.now()
            });
            conn.close();
        } catch (e) {
            console.error('Error closing connection:', e);
        }
    });
    
    connections = {};
    currentRoom = null;
    elements.roomId.textContent = 'None';
    
    // Update UI
    updateRoomUI();
    
    showToast('info', 'Room Left', 'You have left the room');
}

function updateRoomUI() {
    elements.peerCount.textContent = Object.keys(connections).length;
    elements.peerList.innerHTML = '';
    
    if (currentRoom) {
        // Add self
        const selfPeer = document.createElement('div');
        selfPeer.className = 'peer-item';
        selfPeer.innerHTML = `
            <div class="status"></div>
            <span>${username} (You)</span>
        `;
        elements.peerList.appendChild(selfPeer);
        
        // Add connected peers
        Object.keys(connections).forEach(peerId => {
            const peerEl = document.createElement('div');
            peerEl.className = 'peer-item';
            peerEl.innerHTML = `
                <div class="status"></div>
                <span>${connections[peerId].metadata?.username || 'Unknown'}</span>
            `;
            elements.peerList.appendChild(peerEl);
        });
    }
}

function connectToPeer(peerId) {
    if (connections[peerId] || peerId === peer.id) return;
    
    console.log('Connecting to peer:', peerId);
    
    try {
        const conn = peer.connect(peerId, {
            reliable: true,
            metadata: {
                username,
                roomId: currentRoom
            }
        });
        
        handleConnection(conn);
    } catch (e) {
        console.error('Connection error:', e);
        showToast('error', 'Connection Failed', `Failed to connect to peer: ${e.message}`);
    }
}

function handleConnection(conn) {
    // Prevent duplicate connections
    if (connections[conn.peer]) {
        console.log('Already connected to peer:', conn.peer);
        return;
    }
    
    conn.on('open', () => {
        console.log('Connected to peer:', conn.peer);
        connections[conn.peer] = conn;
        
        // Send our user info
        conn.send({
            type: 'system',
            action: 'join',
            roomId: currentRoom,
            peerId: peer.id,
            username: username,
            timestamp: Date.now()
        });
        
        updateRoomUI();
        
        showToast('success', 'Peer Connected', `Connected to ${conn.metadata?.username || 'a new peer'}`);
    });
    
    conn.on('data', (data) => {
        handleDataReceived(conn, data);
    });
    
    conn.on('close', () => {
        console.log('Connection closed:', conn.peer);
        delete connections[conn.peer];
        updateRoomUI();
        
        showToast('info', 'Peer Disconnected', `${conn.metadata?.username || 'A peer'} has disconnected`);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        showToast('error', 'Connection Error', err.message);
        
        // Cleanup failed connection
        delete connections[conn.peer];
        updateRoomUI();
    });
}

// File Upload/Transfer Functions
function setupDropArea() {
    const dropArea = elements.dropArea;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-active');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-active');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    dropArea.addEventListener('click', () => {
        elements.fileInput.click();
    });
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
    
    // Reset file input
    e.target.value = '';
}

function handleFiles(files) {
    if (!currentRoom || Object.keys(connections).length === 0) {
        showToast('warning', 'No Peers Connected', 'Join a room with other peers to share files');
        return;
    }
    
    [...files].forEach(file => {
        // Add to queue for each peer
        Object.values(connections).forEach(conn => {
            const transferId = generateId(8);
            
            transferQueue.push({
                id: transferId,
                file,
                connection: conn,
                state: 'queued',
                progress: 0
            });
            
            // Add to UI
            addTransferToUI(transferId, file, 'uploading', 0);
        });
    });
    
    // Start processing queue
    processTransferQueue();
    
    showToast('info', 'Files Added', `${files.length} files added to upload queue`);
}

function processTransferQueue() {
    if (transferQueue.length === 0) return;
    
    // Process next item in queue
    const transfer = transferQueue.shift();
    
    if (!connections[transfer.connection.peer]) {
        // Peer disconnected, skip this transfer
        transfer.state = 'error';
        updateTransferUI(transfer.id, 'error', 100, 'Peer disconnected');
        processTransferQueue();
        return;
    }
    
    // Start the transfer
    transfers[transfer.id] = transfer;
    transfer.state = 'uploading';
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileData = e.target.result;
        
        // In a real app, you'd want to chunk large files
        // For simplicity, we're sending the whole file at once
        transfer.connection.send({
            type: 'file',
            id: transfer.id,
            name: transfer.file.name,
            size: transfer.file.size,
            mimeType: transfer.file.type,
            data: fileData,
            encrypted: encryptionEnabled,
            timestamp: Date.now()
        });
        
        // Mark as sent
        transfer.state = 'sent';
        transfer.progress = 100;
        updateTransferUI(transfer.id, 'completed', 100);
        
        // Process next in queue
        processTransferQueue();
    };
    
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            transfer.progress = progress;
            updateTransferUI(transfer.id, 'uploading', progress);
        }
    };
    
    reader.onerror = () => {
        transfer.state = 'error';
        updateTransferUI(transfer.id, 'error', 0, 'Error reading file');
        processTransferQueue();
    };
    
    // Start reading
    reader.readAsArrayBuffer(transfer.file);
}

function handleDataReceived(conn, data) {
    if (typeof data === 'object' && data !== null) {
        switch (data.type) {
            case 'file':
                handleFileReceived(conn, data);
                break;
            case 'chat':
                handleChatMessage(conn, data);
                break;
            case 'whiteboard':
                handleWhiteboardData(data);
                break;
            case 'textEditor':
                handleTextEditorUpdate(data);
                break;
            case 'system':
                handleSystemMessage(conn, data);
                break;
            default:
                console.log('Unknown data type:', data.type);
        }
    }
}

function handleSystemMessage(conn, data) {
    console.log('System message:', data);
    
    switch (data.action) {
        case 'join':
            // Update room registry with the new peer
            if (currentRoom) {
                const roomRegistry = JSON.parse(localStorage.getItem('fileShareRooms') || '{}');
                if (roomRegistry[currentRoom]) {
                    if (!roomRegistry[currentRoom].peers.includes(data.peerId)) {
                        roomRegistry[currentRoom].peers.push(data.peerId);
                        localStorage.setItem('fileShareRooms', JSON.stringify(roomRegistry));
                    }
                }
            }
            
            // If we're already connected to this peer, no need to reconnect
            if (connections[data.peerId]) return;
            
            // If we receive a join from someone we're not connected to, connect back
            if (!connections[data.peerId] && data.peerId !== peer.id) {
                connectToPeer(data.peerId);
            }
            break;
            
        case 'leave':
            // Update room registry
            if (currentRoom) {
                const roomRegistry = JSON.parse(localStorage.getItem('fileShareRooms') || '{}');
                if (roomRegistry[currentRoom]) {
                    roomRegistry[currentRoom].peers = roomRegistry[currentRoom].peers.filter(id => id !== data.peerId);
                    
                    // Clean up empty rooms
                    if (roomRegistry[currentRoom].peers.length === 0) {
                        delete roomRegistry[currentRoom];
                    }
                    
                    localStorage.setItem('fileShareRooms', JSON.stringify(roomRegistry));
                }
            }
            break;
    }
}

function handleFileReceived(conn, data) {
    console.log('File received:', data.name);
    
    // Create a transfer record
    const transferId = data.id;
    transfers[transferId] = {
        id: transferId,
        name: data.name,
        size: data.size,
        mimeType: data.mimeType,
        state: 'downloading',
        connection: conn,
        encrypted: data.encrypted,
        progress: 100,
        data: data.data
    };
    
    // Add to UI
    addTransferToUI(transferId, {
        name: data.name,
        size: data.size,
        type: data.mimeType
    }, 'downloading', 100);
    
    // Mark as completed after a short delay
    setTimeout(() => {
        updateTransferUI(transferId, 'completed', 100);
    }, 500);
    
    showToast('success', 'File Received', `Received ${data.name} from ${conn.metadata?.username || 'a peer'}`);
}

// Whiteboard Functions
function initWhiteboard() {
    canvas = elements.whiteboard;
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Redraw if needed
    // In a real app, you might save the drawing state and restore it here
}

function startDrawing(e) {
    isDrawing = true;
    const { offsetX, offsetY } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    lastDrawPoint = { x: offsetX, y: offsetY };
    
    // Send start drawing event to peers
    broadcastWhiteboardEvent('start', { x: offsetX, y: offsetY });
}

function draw(e) {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = getCoordinates(e);
    
    if (currentWhiteboardTool === 'pen') {
        ctx.strokeStyle = whiteboardColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    } else if (currentWhiteboardTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    }
    
    lastDrawPoint = { x: offsetX, y: offsetY };
    
    // Send draw event to peers
    broadcastWhiteboardEvent('draw', { 
        x: offsetX, 
        y: offsetY, 
        tool: currentWhiteboardTool, 
        color: whiteboardColor 
    });
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
    
    // Send stop drawing event to peers
    broadcastWhiteboardEvent('stop', {});
}

function clearWhiteboard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Send clear event to peers
    broadcastWhiteboardEvent('clear', {});
}

function getCoordinates(e) {
    if (e.type.includes('touch')) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top
        };
    } else {
        return {
            offsetX: e.offsetX,
            offsetY: e.offsetY
        };
    }
}

function handleTouch(e) {
    e.preventDefault();
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' : 'mousemove', 
        {
            clientX: touch.clientX,
            clientY: touch.clientY
        }
    );
    
    canvas.dispatchEvent(mouseEvent);
}

function broadcastWhiteboardEvent(action, data) {
    if (!currentRoom || Object.keys(connections).length === 0) return;
    
    Object.values(connections).forEach(conn => {
        conn.send({
            type: 'whiteboard',
            action,
            data,
            timestamp: Date.now()
        });
    });
}

function handleWhiteboardData(data) {
    switch (data.action) {
        case 'start':
            ctx.beginPath();
            ctx.moveTo(data.data.x, data.data.y);
            break;
        case 'draw':
            ctx.strokeStyle = data.data.tool === 'eraser' ? '#ffffff' : data.data.color;
            ctx.lineWidth = data.data.tool === 'eraser' ? 20 : 2;
            ctx.lineCap = 'round';
            
            ctx.lineTo(data.data.x, data.data.y);
            ctx.stroke();
            break;
        case 'stop':
            ctx.beginPath();
            break;
        case 'clear':
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            break;
    }
}

// Collaborative Text Editor
function broadcastTextEditorChanges() {
    if (!currentRoom || Object.keys(connections).length === 0) return;
    
    Object.values(connections).forEach(conn => {
        conn.send({
            type: 'textEditor',
            content: elements.textEditor.innerHTML,
            timestamp: Date.now()
        });
    });
}

function handleTextEditorUpdate(data) {
    elements.textEditor.innerHTML = data.content;
}

// Chat Functions
function sendChatMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;
    
    // Add to local chat
    addChatMessage(username, message, true);
    
    // Send to peers
    if (currentRoom && Object.keys(connections).length > 0) {
        Object.values(connections).forEach(conn => {
            conn.send({
                type: 'chat',
                sender: username,
                message,
                timestamp: Date.now()
            });
        });
    }
    
    // Clear input
    elements.messageInput.value = '';
}

function handleChatMessage(conn, data) {
    addChatMessage(data.sender, data.message, false);
}

function addChatMessage(sender, message, isSelf) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${isSelf ? 'message-self' : 'message-other'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    msgEl.innerHTML = `
        ${!isSelf ? `<div class="message-sender">${sender}</div>` : ''}
        <div class="message-content">${message}</div>
        <div class="message-time">${time}</div>
    `;
    
    elements.chatMessages.appendChild(msgEl);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// UI Helpers
function activateTab(tab) {
    // Deactivate all tabs
    elements.tabs.forEach(t => t.classList.remove('active'));
    elements.tabContents.forEach(c => c.classList.remove('active'));
    
    // Activate selected tab
    tab.classList.add('active');
    const tabId = tab.getAttribute('data-tab');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function filterTransfers(filter) {
    const items = elements.transferList.querySelectorAll('.transfer-item');
    
    items.forEach(item => {
        if (filter === 'all') {
            item.style.display = 'flex';
        } else {
            const status = item.getAttribute('data-status');
            item.style.display = status === filter ? 'flex' : 'none';
        }
    });
}

function toggleTheme() {
    darkMode = elements.themeSwitch.checked || elements.darkModeToggle.checked;
    
    // Sync the toggle states
    elements.themeSwitch.checked = darkMode;
    elements.darkModeToggle.checked = darkMode;
    
    if (darkMode) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }
    
    saveSettings();
}

function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            icon = 'fas fa-info-circle';
    }
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close">&times;</div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Sound alert if enabled
    if (elements.soundToggle?.checked) {
        playNotificationSound(type);
    }
}

function playNotificationSound(type) {
    // In a real app, you would play different sounds for different notification types
    const audio = new Audio();
    switch (type) {
        case 'success':
            audio.src = 'https://example.com/sounds/success.mp3';
            break;
        case 'error':
            audio.src = 'https://example.com/sounds/error.mp3';
            break;
        default:
            audio.src = 'https://example.com/sounds/notification.mp3';
    }
    
    // Simplified for demo
    console.log('Playing notification sound for type:', type);
}

// Transfer UI
function addTransferToUI(id, file, type, progress) {
    const item = document.createElement('div');
    item.className = 'transfer-item';
    item.setAttribute('data-id', id);
    item.setAttribute('data-status', type);
    
    // Determine icon based on file type
    let icon = 'fas fa-file';
    if (file.type) {
        if (file.type.startsWith('image/')) {
            icon = 'fas fa-file-image';
        } else if (file.type.startsWith('video/')) {
            icon = 'fas fa-file-video';
        } else if (file.type.startsWith('audio/')) {
            icon = 'fas fa-file-audio';
        } else if (file.type.startsWith('text/')) {
            icon = 'fas fa-file-alt';
        } else if (file.type.includes('pdf')) {
            icon = 'fas fa-file-pdf';
        }
    }
    
    const statusText = type === 'uploading' ? 'Uploading...' : 
                        type === 'downloading' ? 'Downloading...' : 
                        type === 'completed' ? 'Completed' : 
                        'Error';
    
    const statusClass = `status-${type}`;
    
    // Format file size
    const size = formatFileSize(file.size);
    
    item.innerHTML = `
        <div class="file-icon">
            <i class="${icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">
                <div class="file-size">${size}</div>
                <div class="file-type">${file.type || 'Unknown'}</div>
            </div>
        </div>
        <div class="transfer-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="transfer-status ${statusClass}">${statusText}</div>
        <div class="transfer-actions">
            ${type === 'completed' ? `
                <button class="btn-icon preview-btn" title="Preview File">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon download-btn" title="Download File">
                    <i class="fas fa-download"></i>
                </button>
            ` : ''}
            <button class="btn-icon remove-btn" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    elements.transferList.appendChild(item);
    
    // Add event listeners for buttons
    if (type === 'completed') {
        const previewBtn = item.querySelector('.preview-btn');
        const downloadBtn = item.querySelector('.download-btn');
        
        previewBtn.addEventListener('click', () => {
            previewFile(id);
        });
        
        downloadBtn.addEventListener('click', () => {
            downloadFile(id);
        });
    }
    
    // Remove button
    const removeBtn = item.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
        removeTransfer(id);
    });
}

function updateTransferUI(id, status, progress, error = null) {
    const item = document.querySelector(`.transfer-item[data-id="${id}"]`);
    if (!item) return;
    
    item.setAttribute('data-status', status);
    
    const statusEl = item.querySelector('.transfer-status');
    const progressFill = item.querySelector('.progress-fill');
    
    progressFill.style.width = `${progress}%`;
    
    const statusText = status === 'uploading' ? 'Uploading...' : 
                        status === 'downloading' ? 'Downloading...' : 
                        status === 'completed' ? 'Completed' : 
                        error || 'Error';
    
    statusEl.textContent = statusText;
    statusEl.className = `transfer-status status-${status}`;
    
    // Add completed actions if needed
    if (status === 'completed' && !item.querySelector('.preview-btn')) {
        const actionsDiv = item.querySelector('.transfer-actions');
        
        // Add preview and download buttons
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn-icon preview-btn';
        previewBtn.title = 'Preview File';
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.addEventListener('click', () => {
            previewFile(id);
        });
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-icon download-btn';
        downloadBtn.title = 'Download File';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.addEventListener('click', () => {
            downloadFile(id);
        });
        
        actionsDiv.insertBefore(downloadBtn, actionsDiv.firstChild);
        actionsDiv.insertBefore(previewBtn, actionsDiv.firstChild);
    }
}

function removeTransfer(id) {
    const item = document.querySelector(`.transfer-item[data-id="${id}"]`);
    if (item) {
        item.remove();
    }
    
    // Remove from transfers object
    delete transfers[id];
    
    // Remove from transfer queue if still there
    transferQueue = transferQueue.filter(t => t.id !== id);
}

function previewFile(id) {
    const transfer = transfers[id];
    if (!transfer) return;
    
    elements.previewFilename.textContent = transfer.name || 'File Preview';
    elements.previewContainer.innerHTML = '';
    
    // Show the modal
    elements.previewModal.classList.add('active');
    
    // Handle different file types
    const blob = new Blob([transfer.data], { type: transfer.mimeType });
    const url = URL.createObjectURL(blob);
    
    if (transfer.mimeType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = url;
        elements.previewContainer.appendChild(img);
    } else if (transfer.mimeType.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        elements.previewContainer.appendChild(video);
    } else if (transfer.mimeType.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        elements.previewContainer.appendChild(audio);
    } else if (transfer.mimeType.startsWith('text/') || 
               transfer.mimeType.includes('json') || 
               transfer.mimeType.includes('javascript')) {
        // For text files, show the content
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'text-preview';
            div.textContent = e.target.result;
            elements.previewContainer.appendChild(div);
        };
        reader.readAsText(blob);
    } else {
        // Generic file preview
        const div = document.createElement('div');
        div.textContent = 'Preview not available for this file type.';
        elements.previewContainer.appendChild(div);
    }
    
    // Setup download button
    elements.previewDownloadBtn.onclick = () => {
        downloadFile(id);
    };
}

function downloadFile(id) {
    const transfer = transfers[id];
    if (!transfer) return;
    
    const blob = new Blob([transfer.data], { type: transfer.mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Settings
function loadSettings() {
    // Try to load from localStorage
    try {
        const settings = JSON.parse(localStorage.getItem('fileShareSettings'));
        
        if (settings) {
            // Apply settings
            encryptionEnabled = settings.encryption ?? true;
            darkMode = settings.darkMode ?? false;
            username = settings.username || username;
            
            // Update UI
            elements.encryptionToggle.checked = encryptionEnabled;
            elements.darkModeToggle.checked = darkMode;
            elements.themeSwitch.checked = darkMode;
            elements.notificationsToggle.checked = settings.notifications ?? true;
            elements.soundToggle.checked = settings.sound ?? false;
            
            // Apply theme
            if (darkMode) {
                document.body.setAttribute('data-theme', 'dark');
            }
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

function saveSettings() {
    const settings = {
        encryption: elements.encryptionToggle.checked,
        darkMode: elements.darkModeToggle.checked,
        notifications: elements.notificationsToggle.checked,
        sound: elements.soundToggle.checked,
        username
    };
    
    // Update global vars
    encryptionEnabled = settings.encryption;
    darkMode = settings.darkMode;
    
    // Save to localStorage
    localStorage.setItem('fileShareSettings', JSON.stringify(settings));
    
    // Close modal
    elements.settingsModal.classList.remove('active');
    
    showToast('success', 'Settings Saved', 'Your preferences have been saved.');
}

function resetSettings() {
    // Default settings
    encryptionEnabled = true;
    darkMode = false;
    username = `User${Math.floor(Math.random() * 10000)}`;
    
    // Update UI
    elements.encryptionToggle.checked = true;
    elements.darkModeToggle.checked = false;
    elements.themeSwitch.checked = false;
    elements.notificationsToggle.checked = true;
    elements.soundToggle.checked = false;
    
    // Apply theme
    document.body.removeAttribute('data-theme');
    
    // Save to localStorage
    localStorage.removeItem('fileShareSettings');
    
    // Close modal
    elements.settingsModal.classList.remove('active');
    
    showToast('info', 'Settings Reset', 'Your preferences have been reset to defaults.');
}

// Utility Functions
function generateId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    
    for (let i = 0; i < length; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return id;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize App when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Add window cleanup
window.addEventListener('beforeunload', () => {
    // Make sure to leave room when closing
    if (currentRoom) {
        leaveRoom();
    }
});
