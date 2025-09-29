# Signals App

A web application for tracking bull/bear signals from Twitter users on the Ethos Network.

## Features

- Search for Ethos users by their Twitter handle
- View detailed user profiles with Ethos score and statistics
- Track accountability for trading signals (coming soon)

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) v1.40 or later

### Installation

1. Clone this repository
2. Navigate to the project directory
3. Start the development server:

```bash
deno task start
```

The application will be available at `http://localhost:8000`

### Usage

1. **Search**: Enter a Twitter handle in the search box on the homepage
2. **Profile**: Click on a search result to view the user's Ethos profile
3. **Signals**: Signal tracking functionality will be added in future updates

## API Integration

This app integrates with the Ethos Network API v2 to fetch user data:

- User search and lookup by Twitter handle
- Profile information including score, XP, reviews, and vouches
- Score level classification (untrusted, questionable, neutral, etc.)

## Tech Stack

- **Runtime**: Deno
- **Framework**: Fresh (Deno's web framework)
- **Frontend**: Preact + TypeScript
- **Styling**: Tailwind CSS
- **API**: Ethos Network API v2

## Development

```bash
# Start development server with auto-reload
deno task start

# Format code
deno fmt

# Lint code
deno lint

# Type check
deno check **/*.ts **/*.tsx
```

## Future Features

- Twitter bot integration for signal capture
- Bull/bear signal tracking and visualization
- Performance analytics for signals
- User authentication and personalized dashboards



