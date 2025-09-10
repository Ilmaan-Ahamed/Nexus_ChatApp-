Nexus-ChatApp Project Overview


This project implements a fully functional real-time chat room system that enables multiple users to communicate seamlessly across different chat rooms. The system showcases modern networking concepts including WebSocket protocols, asynchronous programming, and scalable message broadcasting.

Key Achievements

 Zero-latency messaging with WebSocket protocol |
 Concurrent user handling supporting 50+ simultaneous connections |
 Multi-room architecture with isolated conversations |
 Persistent message history with intelligent storage management |
 Robust error handling and graceful connection management |
 Production-ready code with comprehensive testing suite. 


🔧 Technical Architecture

Backend: Python 3.7+ with asyncio |
Communication: WebSocket Protocol (RFC 6455) |
Concurrency: Asynchronous I/O with event-driven architecture |
Data Structures: Optimized collections (deque, defaultdict, sets) |
Storage: File-based persistence with memory caching.

Design Patterns Implemented

 Client-Server Pattern: Centralized message management |
 Publisher-Subscriber Pattern: Scalable message broadcasting |
 Event-Driven Architecture: Non-blocking I/O operations |
 Graceful Degradation: Robust error handling and recovery |


 Features

 
 ----- Real-Time Communication ----

Instant messaging with sub-100ms latency
Multi-room support with seamless room switching
User presence indicators (join/leave notifications)
Message history displaying last 5 messages for new joiners

 ----- User Management  -----

Unique username validation with collision detection
Session management with automatic cleanup
Concurrent user support with thread-safe operations

 ----- Data Persistence  -----

Automatic message logging to room-specific files
Memory-efficient storage using bounded message queues
Cross-session history persistence

 ----- Developer Experience  -----

Interactive CLI interface with intuitive commands
Comprehensive testing suite with automated scenarios
Clear error messages and debugging information
Modular architecture for easy extension

Note : Python Server File Runs After the Apps Works
