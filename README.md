# Gaming Chat 🎮

A real-time multiplayer gaming platform with chat functionality. Play classic games with friends!

## Features

- 🎯 **8 Different Games**: Tic-Tac-Toe, Snake, Memory, and more!
- 💬 **Real-time Chat**: Chat with opponents while playing
- 📱 **Responsive Design**: Works on mobile and desktop
- 🎨 **Modern UI**: Beautiful glassmorphism design with animations
- 🔊 **Sound Effects**: Audio feedback for game actions
- 🚀 **Easy Deployment**: Ready to deploy on Render

## Games

1. **Tic-Tac-Toe** ⭕ - Classic 3x3 grid game
2. **Snake** 🐍 - Compete for the highest score
3. **Memory** 🎴 - Match the cards
4. **Air Hockey** 🏒 - Coming soon!
5. **Backgammon** 🎲 - Coming soon!
6. **Connect Four** 🔴 - Coming soon!
7. **Battleship** 🚢 - Coming soon!
8. **Checkers** ⚫ - Coming soon!

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Styling**: Modern CSS with custom design system

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd gaming-chat

# Install all dependencies (root, client, and server)
npm run install:all
```

### Development

```bash
# Run both client and server concurrently
npm run dev

# Or run them separately:
npm run dev:client  # Client on http://localhost:5173
npm run dev:server  # Server on http://localhost:3001
```

### Production Build

```bash
# Build the client
npm run build

# Start the production server
npm start
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Render.

Quick deploy to Render:
1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Use these settings:
   - Build Command: `npm run install:all && npm run build`
   - Start Command: `npm start`
   - Environment: `NODE_ENV=production`

## How to Play

1. **Enter Username**: Start by entering your username
2. **Create or Join Room**: 
   - Create a new game room and share the code with friends
   - Or join an existing room with a code
3. **Play**: Wait for your opponent to join and start playing!
4. **Chat**: Use the chat sidebar to communicate during gameplay

## Project Structure

```
gaming-chat/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── games/       # Game implementations
│   │   ├── pages/       # Main pages
│   │   ├── context/     # React context
│   │   └── styles/      # CSS files
│   └── package.json
├── server/              # Node.js backend
│   ├── src/
│   │   └── server.js    # Express + Socket.io server
│   └── package.json
└── package.json         # Root package.json
```

## Contributing

Feel free to contribute by:
- Adding new games
- Improving existing games
- Fixing bugs
- Enhancing UI/UX

## License

MIT

## Author

Created with ❤️ for gaming enthusiasts
