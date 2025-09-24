const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        sessionId: {type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "Session"},
        userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: false},
        status: {type: String, enum: ['active', 'completed', 'deleted'], default: 'active'},
        input: {type: String, maxlength: 10000},
        clarifyingQuestions: [{type: String, maxlength: 500}],
        narrativeLoop: {
            trigger: {type: String, maxlength: 1000},
            fear: {type: String, maxlength: 1000},
            emotion: {type: String, maxlength: 1000},
            outcome: {type: String, maxlength: 1000},
            whyItFeelsReal: {type: String, maxlength: 1000},
            hiddenLogic: {type: String, maxlength: 1000},
            breakingActions: [{type: String, maxlength: 500}],
            mechanisms: [{type: String, maxlength: 200}]
        },
        spiessMap: {
            sensations: [{type: String, maxlength: 200}],
            emotions: [{type: String, maxlength: 200}],
            needs: [{type: String, enum: [
                'safety', 'belonging', 'autonomy', 'competence', 'purpose',
                'connection', 'recognition', 'control', 'predictability',
                'growth', 'contribution', 'meaning'
            ]}],
            confirmationBias: {type: String, maxlength: 1000},
            microTest: {
                description: {type: String, maxlength: 500},
                timeframe: {type: String, maxlength: 100},
                successCriteria: {type: String, maxlength: 300}
            },
            toolAction: {
                protocol: {type: String, enum: ['STOP', 'Values First', 'Bridge Belief']},
                steps: [{type: String, maxlength: 300}],
                example: {type: String, maxlength: 500}
            }
        },
        summary: {
            content: {type: String, maxlength: 250},
            mechanisms: [{type: String, maxlength: 100}],
            nextStep: {type: String, maxlength: 200}
        },
        tags: [{type: String, enum: [
            'fear_of_rejection', 'autonomy_threat', 'perfectionism',
            'people_pleasing', 'boundary_signaling', 'attention_testing',
            'vulnerability_avoidance'
        ]}],
        storageOptIn: {type: Boolean, default: false},
        redactNames: {type: Boolean, default: true},
        deletedAt: {type: Date, default: null}
    },
    {timestamps: true}
);

// Index for performance
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
