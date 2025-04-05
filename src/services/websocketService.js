class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = {
      queue: [],
      appointment: [],
      cabinslot: []
    };
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.cabinId = null;
    this.selectedSlot = null;
    this.activeConnections = 0;
    
    // New properties for enhanced connection management
    this.inactivityTimer = null;
    this.inactivityTimeout = 10000; // 1 minute of inactivity before closing
    this.wasClosedDueToInactivity = false;
    
    // Initialize visibility and page lifecycle event handlers
    this.initializeEventHandlers();
  }
  
  // Initialize browser event handlers for proper connection management
  initializeEventHandlers() {
    // This method sets up browser-level events that affect WebSocket connections
    // These are registered once when the service is created
    
    if (typeof window !== 'undefined') {
      // Use pagehide event as a more reliable alternative to beforeunload for mobile
      const terminationEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
      
      window.addEventListener(terminationEvent, (event) => {
        // Only close if the page is actually being unloaded (not put in bfcache)
        if (!event.persisted) {
          console.log(`WebSocketService: ${terminationEvent} event detected, closing connection`);
          this.disconnect(true);
        }
      }, false);
      
      // Handle visibility changes to manage connections when app goes to background
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          console.log('WebSocketService: Tab hidden, starting inactivity timer');
          this.startInactivityTimer();
        } else if (document.visibilityState === 'visible') {
          console.log('WebSocketService: Tab visible again');
          this.clearInactivityTimer();
          
          // Check if connection was closed due to inactivity
          if (this.wasClosedDueToInactivity) {
            console.log('WebSocketService: Reconnecting after inactivity timeout');
            this.wasClosedDueToInactivity = false;
            
            // If we have valid connection parameters, reconnect
            if (this.cabinId && this.selectedSlot) {
              this.reconnectAttempt = 0;
              this.connect(this.cabinId, this.selectedSlot);
            }
          }
        }
      });
    }
  }
  
  // Start inactivity timer when tab goes to background
  startInactivityTimer() {
    // Clear any existing timer first
    this.clearInactivityTimer();
    
    // Only start timer if we have an active connection
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`WebSocketService: Starting inactivity timer for ${this.inactivityTimeout/1000} seconds`);
      
      this.inactivityTimer = setTimeout(() => {
        console.log('WebSocketService: Inactivity timeout reached, closing connection');
        
        // Mark that this closure was due to inactivity
        this.wasClosedDueToInactivity = true;
        console.log('WebSocketService: Set wasClosedDueToInactivity flag to true');
        
        // Force close the connection
        this.disconnect(true);
        
        // Store connection closed state in sessionStorage for potential page reloads
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('websocketClosedDueToInactivity', 'true');
          console.log('WebSocketService: Stored inactivity closure in sessionStorage');
        }
      }, this.inactivityTimeout);
    }
  }
  
  // Clear inactivity timer
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      console.log('WebSocketService: Clearing inactivity timer');
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  connect(cabinId, selectedSlot) {
    if (!cabinId || !selectedSlot) {
      console.error("Cannot connect WebSocket: missing cabinId or selectedSlot");
      return;
    }
    
    // Check for reconnection after inactivity from previous page load
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('websocketClosedDueToInactivity') === 'true') {
      console.log('WebSocketService: Detected previous inactivity closure, reconnecting with clean state');
      this.wasClosedDueToInactivity = true; // Set the flag to true when reconnecting after inactivity
      console.log('WebSocketService: Set wasClosedDueToInactivity flag to true during reconnection');
      sessionStorage.removeItem('websocketClosedDueToInactivity');
    }
    
    // If we already have an active connection with the same parameters, just increment the counter
    if (this.ws && 
        this.ws.readyState === WebSocket.OPEN && 
        this.cabinId === cabinId && 
        this.selectedSlot === selectedSlot) {
      console.log("Reusing existing WebSocket connection");
      this.activeConnections++;
      return;
    }
    
    // Store connection parameters for reconnection
    this.cabinId = cabinId;
    this.selectedSlot = selectedSlot;
    
    // Close existing connection if parameters are different
    this.disconnect();

    // Ensure selectedSlot is a Date object
    const date = selectedSlot instanceof Date ? selectedSlot : new Date(selectedSlot);
    
    if (isNaN(date.getTime())) {
      console.error("Invalid date provided for selectedSlot");
      return;
    }

    const formattedDate = date
      .toISOString()
      .replace(".000", "")
      .replace("T", " ")
      .replace("Z", "+00:00");
    const encodedDate = encodeURIComponent(formattedDate);
    
    // Format the WebSocket URL
    const wsUrl = `${process.env.REACT_APP_WS_URL}/queue_updates/${cabinId}/${encodedDate}/`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.activeConnections = 1;
      
      this.ws.onopen = () => {
        console.log("WebSocket connected successfully");
        this.reconnectAttempt = 0;
        this.wasClosedDueToInactivity = false;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log("WebSocket message received:", response);
          
          // Route messages based on type
          if ((response.data && response.data.type === "queue_update" && response.data?.data?.queue)) {
            console.log("Queue update received, notifying subscribers");
            this.notifySubscribers("queue", response);
          } 
          
          if ((response.data && response.data.type === "queue_update" && response.data?.data?.appointment)) {
            console.log("Appointment update received, notifying subscribers");
            this.notifySubscribers("appointment", response);
          } 
          
          if (response.data && response.data.type === "queue_update" && response.data?.data?.cabinslot) {
            console.log("Cabin slot update received, notifying subscribers");
            this.notifySubscribers("cabinslot", response);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code ${event.code}`);
        this.handleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.disconnect();
        this.handleReconnect();
      };
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      this.handleReconnect();
    }
  }
  
  handleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    // Don't attempt reconnection if closed due to inactivity or no active connections
    if (this.wasClosedDueToInactivity || this.activeConnections === 0) {
      console.log(`No reconnection attempt: ${this.wasClosedDueToInactivity ? 'closed due to inactivity' : 'no active connections'}`);
      return;
    }
    
    // Exponential backoff for reconnection attempts
    const delay = Math.min(1000 * (2 ** this.reconnectAttempt), 30000);
    this.reconnectAttempt++;
    
    console.log(`Attempting to reconnect WebSocket in ${delay/1000} seconds...`);
    this.reconnectTimer = setTimeout(() => {
      console.log("Attempting WebSocket reconnection now");
      this.connect(this.cabinId, this.selectedSlot);
    }, delay);
  }
  
  disconnect(forceClose = false) {
    // Clear any inactivity timer first
    this.clearInactivityTimer();
    
    // Decrement active connections counter
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    
    // Only close the connection if forced or there are no more active connections
    if (forceClose || this.activeConnections === 0) {
      if (this.ws) {
        console.log("Closing WebSocket connection - " + 
          (forceClose ? "forced close" : "no more active connections"));
          
        // Disable onclose handler first to prevent reconnection attempts during intentional closure
        const originalOnClose = this.ws.onclose;
        this.ws.onclose = function() {};
        
        try {
          this.ws.close(1000, forceClose ? "Force close" : "Normal closure");
        } catch (err) {
          console.error("Error closing WebSocket:", err);
        }
        
        this.ws = null;
      }
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    } else {
      console.log(`WebSocket connection still has ${this.activeConnections} active users`);
    }
  }
  
  subscribe(type, callback) {
    if (!this.subscribers[type]) {
      this.subscribers[type] = [];
    }
    this.subscribers[type].push(callback);
    console.log(`Subscribed to ${type} events. Total subscribers: ${this.subscribers[type].length}`);
    
    // Return unsubscribe function that only removes the callback
    return () => {
      this.subscribers[type] = this.subscribers[type].filter(cb => cb !== callback);
      console.log(`Unsubscribed from ${type} events. Remaining subscribers: ${this.subscribers[type].length}`);
    };
  }
  
  notifySubscribers(type, data) {
    if (this.subscribers[type] && this.subscribers[type].length > 0) {
      console.log(`Notifying ${this.subscribers[type].length} ${type} subscribers`);
      this.subscribers[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${type} subscriber callback:`, error);
        }
      });
    }
  }

  // Check connection status and potentially reload page
  checkConnection() {
    if (this.wasClosedDueToInactivity) {
      console.log('WebSocketService: Connection was closed due to inactivity');
      
      // Determine if page reload is needed
      if (this.cabinId && this.selectedSlot) {
        // Don't reset the flag here, let the caller handle it after reload
        return { shouldReload: true };
      }
    }
    
    // Only reset the flag if we're not reloading
    // We'll let the caller reset it after handling the reload decision
    return { 
      shouldReload: false, 
      connectionState: this.ws ? this.ws.readyState : WebSocket.CLOSED 
    };
  }

  // Create a method to handle cleanup on logout
  cleanupOnLogout() {
    console.log("WebSocketService: Cleaning up connections on logout");
    this.clearInactivityTimer();
    this.activeConnections = 0;
    this.disconnect(true); // Force close on logout
    this.cabinId = null;
    this.selectedSlot = null;
    this.reconnectAttempt = 0;
    this.wasClosedDueToInactivity = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear all subscribers
    this.subscribers = {
      queue: [],
      appointment: [],
      cabinslot: []
    };
    console.log("WebSocketService: Cleanup complete");
  }

  // Set the inactivity timeout (in milliseconds)
  setInactivityTimeout(timeout) {
    if (timeout && typeof timeout === 'number' && timeout > 0) {
      console.log(`WebSocketService: Setting inactivity timeout to ${timeout/1000} seconds`);
      this.inactivityTimeout = timeout;
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 