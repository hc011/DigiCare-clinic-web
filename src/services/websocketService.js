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
  }

  connect(cabinId, selectedSlot) {
    if (!cabinId || !selectedSlot) {
      console.error("Cannot connect WebSocket: missing cabinId or selectedSlot");
      return;
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
    
    // Only attempt reconnection if we have active subscribers
    if (this.activeConnections === 0) {
      console.log("No active connections, skipping reconnection");
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
    // Decrement active connections counter
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    
    // Only close the connection if forced or there are no more active connections
    if (forceClose || this.activeConnections === 0) {
      if (this.ws) {
        console.log("Closing WebSocket connection - " + 
          (forceClose ? "forced close" : "no more active connections"));
        this.ws.close();
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

  // Create a method to handle cleanup on logout
  cleanupOnLogout() {
    console.log("WebSocketService: Cleaning up connections on logout");
    this.activeConnections = 0;
    this.disconnect(true); // Force close on logout
    this.cabinId = null;
    this.selectedSlot = null;
    this.reconnectAttempt = 0;
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
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 