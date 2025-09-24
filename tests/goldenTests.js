const request = require('supertest');
const app = require('../app');
const Session = require('../models/session');
const Analytics = require('../models/analytics');

describe('Clarify MVP Golden Test Suite', () => {
  let testSessionId;

  beforeAll(async () => {
    // Clean up any existing test data
    await Session.deleteMany({ sessionId: { $regex: /^test-/ } });
    await Analytics.deleteMany({ sessionId: { $regex: /^test-/ } });
  });

  afterAll(async () => {
    // Clean up test data
    await Session.deleteMany({ sessionId: { $regex: /^test-/ } });
    await Analytics.deleteMany({ sessionId: { $regex: /^test-/ } });
  });

  describe('Test Case 1: Social Exclusion Scenario', () => {
    test('should process social exclusion input and generate complete analysis', async () => {
      const input = "I was at a party last night and everyone was talking in groups, but I was standing alone. I felt like they were all avoiding me and I started to think that maybe they don't actually like me. I ended up leaving early because I felt so uncomfortable and now I'm wondering if I should just stop trying to make friends.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.tags).toBeDefined();

      // Validate narrative loop structure
      expect(response.body.narrativeLoop.trigger).toBeDefined();
      expect(response.body.narrativeLoop.fear).toBeDefined();
      expect(response.body.narrativeLoop.emotion).toBeDefined();
      expect(response.body.narrativeLoop.outcome).toBeDefined();
      expect(response.body.narrativeLoop.whyItFeelsReal).toBeDefined();
      expect(response.body.narrativeLoop.hiddenLogic).toBeDefined();
      expect(Array.isArray(response.body.narrativeLoop.breakingActions)).toBe(true);
      expect(Array.isArray(response.body.narrativeLoop.mechanisms)).toBe(true);

      // Validate SPIESS map structure
      expect(Array.isArray(response.body.spiessMap.sensations)).toBe(true);
      expect(Array.isArray(response.body.spiessMap.emotions)).toBe(true);
      expect(Array.isArray(response.body.spiessMap.needs)).toBe(true);
      expect(response.body.spiessMap.confirmationBias).toBeDefined();
      expect(response.body.spiessMap.microTest).toBeDefined();
      expect(response.body.spiessMap.toolAction).toBeDefined();

      // Validate summary structure
      expect(response.body.summary.content).toBeDefined();
      expect(response.body.summary.content.split(' ').length).toBeLessThanOrEqual(250);
      expect(Array.isArray(response.body.summary.mechanisms)).toBe(true);
      expect(response.body.summary.nextStep).toBeDefined();

      testSessionId = response.body.sessionId;
    });
  });

  describe('Test Case 2: Work Criticism Scenario', () => {
    test('should process work criticism input and generate complete analysis', async () => {
      const input = "My boss called me into his office today and told me that my presentation yesterday was 'not up to standard' and that I need to 'step up my game'. I felt like a complete failure and now I'm worried that I'm going to get fired. I can't stop thinking about what I did wrong and I'm afraid to ask for clarification because I don't want to look stupid.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Check for expected tags
      expect(response.body.tags).toContain('fear_of_rejection');
      expect(response.body.tags).toContain('perfectionism');
    });
  });

  describe('Test Case 3: Partner Delay Scenario', () => {
    test('should process partner delay input and generate complete analysis', async () => {
      const input = "My partner was supposed to meet me for dinner at 7 PM but didn't show up until 8:30 PM. They didn't call or text to let me know they were running late. I sat there for an hour and a half feeling embarrassed and angry. When they finally arrived, they just said 'sorry, got caught up at work' and didn't seem to understand why I was upset. Now I'm questioning if they really care about me.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Check for expected tags
      expect(response.body.tags).toContain('fear_of_rejection');
      expect(response.body.tags).toContain('attention_testing');
    });
  });

  describe('Test Case 4: Perfectionism Scenario', () => {
    test('should process perfectionism input and generate complete analysis', async () => {
      const input = "I spent 8 hours working on a project that should have taken 2 hours because I kept redoing it. I'm never satisfied with my work and always find something wrong with it. I'm afraid to submit anything because I know it's not perfect, but the deadline is tomorrow and I'm panicking. I feel like if I don't do everything perfectly, people will think I'm incompetent.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Check for expected tags
      expect(response.body.tags).toContain('perfectionism');
      expect(response.body.tags).toContain('fear_of_rejection');
    });
  });

  describe('Test Case 5: Autonomy Threat Scenario', () => {
    test('should process autonomy threat input and generate complete analysis', async () => {
      const input = "My manager keeps micromanaging everything I do. They want me to check in every hour and get approval for every decision, even small ones. I feel like I can't breathe and I'm starting to doubt my own judgment. I used to be confident in my work but now I second-guess everything. I feel trapped and controlled.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Check for expected tags
      expect(response.body.tags).toContain('autonomy_threat');
    });
  });

  describe('Test Case 6: Body-First Sensations with STOP Protocol', () => {
    test('should process body-first sensations and recommend STOP protocol', async () => {
      const input = "When I get anxious, I feel it in my body first - my chest gets tight, my heart races, and I start sweating. My mind goes blank and I can't think straight. I feel like I'm going to have a panic attack. I need to do something to stop this feeling but I don't know what.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Check that STOP protocol is recommended
      expect(response.body.spiessMap.toolAction.protocol).toBe('STOP');
      expect(response.body.spiessMap.toolAction.steps).toBeDefined();
      expect(response.body.spiessMap.toolAction.example).toBeDefined();
    });
  });

  describe('Test Case 7: Crisis Detection', () => {
    test('should detect crisis content and return appropriate response', async () => {
      const input = "I want to kill myself. I can't take this anymore. There's no point in living.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.response.code).toBe('CRISIS_DETECTED');
      expect(response.body.response.message).toContain('crisis');
      expect(response.body.response.resources).toBeDefined();
    });
  });

  describe('Test Case 8: Clarifying Questions', () => {
    test('should ask clarifying questions when input is incomplete', async () => {
      const input = "I had a bad day at work.";

      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stage).toBe('clarifying_questions');
      expect(response.body.questions).toBeDefined();
      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.questions.length).toBeLessThanOrEqual(3);
      expect(response.body.needsAnswers).toBe(true);
    });
  });

  describe('Test Case 9: Answer Processing', () => {
    test('should process answers to clarifying questions', async () => {
      const sessionId = testSessionId || 'test-session-123';
      const answers = [
        "I felt excluded because everyone was in groups and I was alone",
        "I'm afraid they don't actually like me and are just being polite",
        "I felt sad and embarrassed, like I was invisible"
      ];

      const response = await request(app)
        .post('/api/v1/answers')
        .send({
          sessionId,
          answers
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrativeLoop).toBeDefined();
      expect(response.body.spiessMap).toBeDefined();
      expect(response.body.summary).toBeDefined();
    });
  });

  describe('Test Case 10: Session Management', () => {
    test('should retrieve session by ID', async () => {
      if (!testSessionId) {
        // Create a test session first
        const session = new Session({
          sessionId: 'test-session-retrieve',
          status: 'completed',
          input: 'Test input',
          narrativeLoop: { trigger: 'test' },
          spiessMap: { sensations: ['test'] },
          summary: { content: 'test summary' },
          tags: ['test']
        });
        await session.save();
        testSessionId = 'test-session-retrieve';
      }

      const response = await request(app)
        .get(`/api/v1/session/${testSessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.sessionId).toBe(testSessionId);
    });

    test('should delete session by ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/session/${testSessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('Test Case 11: Feedback Submission', () => {
    test('should submit feedback for a session', async () => {
      const response = await request(app)
        .post('/api/v1/feedback')
        .send({
          sessionId: 'test-session-feedback',
          rating: 4,
          helpful: true,
          comments: 'Very helpful analysis',
          categories: ['accuracy', 'usefulness']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('submitted');
      expect(response.body.feedbackId).toBeDefined();
    });
  });

  describe('Test Case 12: Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input: '',
          storageOptIn: true,
          redactNames: true
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle missing session ID', async () => {
      const response = await request(app)
        .get('/api/v1/session/')
        .expect(404);

      expect(response.body.status).toBe(404);
    });

    test('should handle invalid feedback data', async () => {
      const response = await request(app)
        .post('/api/v1/feedback')
        .send({
          sessionId: 'test',
          rating: 6, // Invalid rating
          helpful: 'yes' // Invalid type
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEMA_VALIDATION_FAILED');
    });
  });

  describe('Performance Tests', () => {
    test('should process 1000-character input within performance limits', async () => {
      const longInput = "I had a really difficult day at work today. ".repeat(25); // ~1000 characters
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          input: longInput,
          storageOptIn: true,
          redactNames: true
        })
        .expect(200);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(8000); // Should be under 8 seconds (p95 limit)
      
      expect(response.body.success).toBe(true);
      expect(response.body.processingTime).toBeDefined();
    });
  });
});
