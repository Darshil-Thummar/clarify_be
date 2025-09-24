# Clarify Backend API

A comprehensive mental health analysis API that processes user input through a three-stage analysis pipeline: Narrative Loop extraction, SPIESS Map generation, and concise summary creation.

## Features

- **Three-Stage Analysis Pipeline**: Narrative Loop → SPIESS Map → Summary
- **AI-Powered Processing**: Uses OpenAI GPT-4 for intelligent analysis
- **Safety & Privacy**: Crisis detection, input sanitization, PII redaction
- **Schema Validation**: Robust validation with repair mode for malformed data
- **Analytics & Events**: Comprehensive event tracking and analytics
- **Session Management**: Secure session handling with 90-day retention policy
- **Feedback System**: User feedback collection and analysis
- **Performance Optimized**: Sub-8-second processing for 1000-character inputs

## Setup

### Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clarify_be
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/clarify
MONGODB_TEST_URI=mongodb://localhost:27017/clarify_test

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
SALT_ROUNDS=10

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Client Configuration
CLIENT_URL=http://localhost:3000
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

Server will be available at: http://localhost:8080

## API Endpoints

### Analysis Endpoints

#### POST `/api/v1/analyze`
Analyze user input and generate narrative loop, SPIESS map, and summary.

**Request Body:**
```json
{
  "input": "I was at a party and felt excluded...",
  "storageOptIn": true,
  "redactNames": true
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "objectId",
  "narrativeLoop": {
    "trigger": "What started this situation",
    "fear": "What they're afraid of",
    "emotion": "What they're feeling",
    "outcome": "What they expect to happen",
    "whyItFeelsReal": "Why this fear feels real",
    "hiddenLogic": "The hidden logic driving this",
    "breakingActions": ["Action 1", "Action 2"],
    "mechanisms": ["mechanism1", "mechanism2"]
  },
  "spiessMap": {
    "sensations": ["physical sensation 1", "physical sensation 2"],
    "emotions": ["emotion 1", "emotion 2"],
    "needs": ["safety", "belonging"],
    "confirmationBias": "Cause-effect sentence about confirmation bias",
    "microTest": {
      "description": "Test description",
      "timeframe": "Within 24 hours",
      "successCriteria": "How to measure success"
    },
    "toolAction": {
      "protocol": "STOP",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "example": "Concrete example"
    }
  },
  "summary": {
    "content": "Concise summary under 250 words...",
    "mechanisms": ["key mechanism 1", "key mechanism 2"],
    "nextStep": "One clear next step"
  },
  "tags": ["fear_of_rejection", "perfectionism"],
  "processingTime": 2500
}
```

#### POST `/api/v1/answers`
Process answers to clarifying questions.

**Request Body:**
```json
{
  "sessionId": "objectId",
  "answers": ["Answer 1", "Answer 2", "Answer 3"]
}
```

### Session Management

#### GET `/api/v1/session/{id}`
Retrieve session by ID.

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "objectId",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "input": "Original input (if storage opted in)",
    "clarifyingQuestions": ["Question 1", "Question 2"],
    "narrativeLoop": { /* narrative loop data */ },
    "spiessMap": { /* SPIESS map data */ },
    "summary": { /* summary data */ },
    "tags": ["tag1", "tag2"],
    "analytics": { /* analytics summary */ }
  }
}
```

#### DELETE `/api/v1/session/{id}`
Delete session by ID.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### Feedback

#### POST `/api/v1/feedback`
Submit feedback for a session.

**Request Body:**
```json
{
  "sessionId": "objectId",
  "rating": 4,
  "helpful": true,
  "comments": "Very helpful analysis",
  "categories": ["accuracy", "usefulness"]
}
```

### Health Checks

#### GET `/health`
Basic health check.

#### GET `/health/detailed`
Detailed health check with database status and cleanup statistics.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "details": [ /* validation errors if applicable */ ]
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `CRISIS_DETECTED`: Crisis content detected
- `JSON_REPAIR`: Data structure repaired with hypothesis placeholders
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_SESSION`: Session not found or access denied
- `SCHEMA_VALIDATION_FAILED`: Schema validation failed
- `AI_PROCESSING_ERROR`: AI processing failed
- `INTERNAL_SERVER_ERROR`: Server error

## Safety Features

### Crisis Detection
Automatically detects crisis content and returns appropriate resources:
- Suicide ideation
- Self-harm references
- Crisis keywords and patterns

### Input Sanitization
- Removes HTML tags and scripts
- Strips URLs and prompt injection attempts
- Limits input length to 10,000 characters

### PII Redaction
- Email addresses
- Phone numbers
- SSN and credit card numbers
- Names (configurable)

## Analytics & Events

The system tracks the following events:
- `session_started`
- `input_received`
- `questions_asked`
- `loop_built`
- `spiess_built`
- `summary_built`
- `safe_exit`
- `user_deleted_data`
- `micro_test_completed`
- `day2_return`

## Data Retention

- **90-day retention policy**: Data older than 90 days is automatically deleted
- **7-day incomplete sessions**: Incomplete sessions are marked as deleted after 7 days
- **Storage opt-in**: Data is only stored when user explicitly opts in
- **Soft delete**: Sessions are soft-deleted and can be recovered within retention period

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Golden Test Suite
The test suite includes 12 comprehensive test cases covering:
- Social exclusion scenarios
- Work criticism scenarios
- Partner delay scenarios
- Perfectionism scenarios
- Autonomy threat scenarios
- Body-first sensations with STOP protocol
- Crisis detection
- Clarifying questions
- Answer processing
- Session management
- Feedback submission
- Error handling
- Performance tests

## Performance

- **Target Performance**: p50 < 5s, p95 < 8s for 1000-character inputs
- **Retry Logic**: One retry allowed on formatting failure, then repair mode
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Caching**: Session data cached for quick retrieval

## Security

- **Helmet.js**: Security headers
- **Rate Limiting**: Per-IP and per-session limits
- **Input Validation**: Comprehensive input sanitization
- **CORS**: Configurable cross-origin resource sharing
- **Environment Variables**: All secrets stored in environment variables

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clarify
OPENAI_API_KEY=your_production_openai_key
JWT_SECRET=your_production_jwt_secret
CLIENT_URL=https://your-frontend-domain.com
```

### Health Checks
- Basic: `GET /health`
- Detailed: `GET /health/detailed`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC License


