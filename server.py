import asyncio
import websockets
import json
from collections import defaultdict, deque
from datetime import datetime
import os

class ChatServer:
    def __init__(self, host='localhost', port=2024):
        self.host = host
        self.port = port
        self.users = {}  # websocket -> username
        self.rooms = defaultdict(set)  # room -> set of websockets
        self.messages = defaultdict(lambda: deque(maxlen=5))  # room -> last 5 messages
        self.user_rooms = {}  # username -> current room
        
    async def handle_client(self, websocket, path):
        """Handle incoming client connections"""
        self.users[websocket] = None
        print(f"New client connected: {websocket.remote_address}")
        
        try:
            async for message in websocket:
                await self.process_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"Client disconnected: {websocket.remote_address}")
        except Exception as e:
            print(f"Error handling client: {e}")
        finally:
            await self.remove_user(websocket)
    
    async def process_message(self, websocket, message):
        """Process incoming messages from clients"""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "login":
                await self.handle_login(websocket, data)
            elif msg_type == "join":
                await self.handle_join(websocket, data)
            elif msg_type == "publish":
                await self.handle_publish(websocket, data)
            elif msg_type == "who":
                await self.handle_who(websocket, data)
            else:
                print(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError:
            print(f"Invalid JSON received: {message}")
    
    async def handle_login(self, websocket, data):
        """Handle user login"""
        username = data.get("username", "").strip()
        
        if not username:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Username is required"
            }))
            return
            
        # Check if username is already taken
        if username in [u for u in self.users.values() if u]:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Username already taken"
            }))
            return
            
        self.users[websocket] = username
        print(f"User '{username}' logged in")
        
        await websocket.send(json.dumps({
            "type": "system", 
            "message": f"Welcome {username}!"
        }))
        
        # Send current room list
        await self.broadcast_rooms()
    
    async def handle_join(self, websocket, data):
        """Handle user joining a room"""
        username = self.users.get(websocket)
        if not username:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Please login first"
            }))
            return
            
        room = data.get("room", "").strip()
        if not room:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Room name is required"
            }))
            return
        
        # Leave current room if any
        if username in self.user_rooms:
            old_room = self.user_rooms[username]
            if old_room in self.rooms and websocket in self.rooms[old_room]:
                self.rooms[old_room].discard(websocket)
                await self.notify_room(old_room, {
                    "type": "system",
                    "message": f"{username} left the room"
                })
        
        # Join new room
        self.rooms[room].add(websocket)
        self.user_rooms[username] = room
        
        # Send room history
        if room in self.messages:
            await websocket.send(json.dumps({
                "type": "history",
                "room": room,
                "messages": list(self.messages[room])
            }))
        
        # Notify room
        await self.notify_room(room, {
            "type": "system",
            "message": f"{username} joined the room"
        })
        
        print(f"User '{username}' joined room '{room}'")
        await self.broadcast_rooms()
    
    async def handle_publish(self, websocket, data):
        """Handle message publishing"""
        username = self.users.get(websocket)
        if not username:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Please login first"
            }))
            return
            
        room = data.get("room", "").strip()
        message_text = data.get("message", "").strip()
        
        if not room or room not in self.rooms or websocket not in self.rooms[room]:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "You are not in this room"
            }))
            return
            
        if not message_text:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Message cannot be empty"
            }))
            return
        
        # Create message object
        message_data = {
            "user": username,
            "message": message_text,
            "room": room,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to history
        self.messages[room].append(message_data)
        
        # Broadcast to room
        await self.notify_room(room, {
            "type": "message",
            **message_data
        })
        
        print(f"Message from '{username}' in room '{room}': {message_text}")
    
    async def handle_who(self, websocket, data):
        """Handle who request"""
        room = data.get("room", "").strip()
        if not room or room not in self.rooms:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "Room not found"
            }))
            return
            
        # Get members in room
        members = []
        for ws in self.rooms[room]:
            if ws in self.users and self.users[ws]:
                members.append(self.users[ws])
        
        await websocket.send(json.dumps({
            "type": "who",
            "room": room,
            "members": members
        }))
    
    async def notify_room(self, room, message):
        """Send message to all users in a room"""
        if room in self.rooms:
            for user_ws in self.rooms[room]:
                try:
                    await user_ws.send(json.dumps(message))
                except:
                    # Remove disconnected users
                    await self.remove_user(user_ws)
    
    async def broadcast_rooms(self):
        """Broadcast room list to all users"""
        rooms = list(self.rooms.keys())
        for ws in self.users:
            try:
                await ws.send(json.dumps({
                    "type": "rooms",
                    "rooms": rooms
                }))
            except:
                await self.remove_user(ws)
    
    async def remove_user(self, websocket):
        """Remove a user from the server"""
        username = self.users.get(websocket)
        
        if username:
            # Remove from current room
            if username in self.user_rooms:
                room = self.user_rooms[username]
                if room in self.rooms and websocket in self.rooms[room]:
                    self.rooms[room].discard(websocket)
                    await self.notify_room(room, {
                        "type": "system",
                        "message": f"{username} left the room"
                    })
                
                del self.user_rooms[username]
            
            print(f"User '{username}' disconnected")
        
        if websocket in self.users:
            del self.users[websocket]
        
        await self.broadcast_rooms()

async def main():
    server = ChatServer()
    
    # Start server
    start_server = await websockets.serve(
        server.handle_client, 
        server.host, 
        server.port
    )
    
    print(f"Chat server started on ws://{server.host}:{server.port}")
    print("Server is ready to accept connections")
    print("Press Ctrl+C to stop the server")
    
    # Keep server running
    await start_server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped by user")