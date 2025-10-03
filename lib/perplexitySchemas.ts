// lib/perplexitySchemas.ts
// Structured output schemas for Perplexity API

/**
 * Standard search result schema for grounded answers with citations
 */
export const GROUNDED_ANSWER_SCHEMA = {
  name: 'grounded_answer',
  schema: {
    type: 'object',
    properties: {
      answer: {
        type: 'string',
        description: 'Comprehensive answer based on web sources'
      },
      key_points: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key bullet points from the answer'
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence level based on source quality'
      },
      sources_used: {
        type: 'number',
        description: 'Number of sources consulted'
      }
    },
    required: ['answer', 'key_points', 'confidence']
  },
  strict: true
};

/**
 * Financial analysis schema for companies and markets
 */
export const FINANCIAL_ANALYSIS_SCHEMA = {
  name: 'financial_analysis',
  schema: {
    type: 'object',
    properties: {
      company_name: {
        type: 'string',
        description: 'Name of the company'
      },
      summary: {
        type: 'string',
        description: 'Brief financial summary'
      },
      revenue: {
        type: 'object',
        properties: {
          amount: { type: 'string' },
          currency: { type: 'string' },
          period: { type: 'string' }
        }
      },
      key_metrics: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            value: { type: 'string' },
            trend: { type: 'string', enum: ['up', 'down', 'stable', 'unknown'] }
          },
          required: ['metric', 'value']
        }
      },
      risks: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key risk factors'
      },
      opportunities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key opportunities'
      }
    },
    required: ['company_name', 'summary', 'key_metrics']
  },
  strict: true
};

/**
 * Competitive analysis schema for comparing companies
 */
export const COMPETITIVE_ANALYSIS_SCHEMA = {
  name: 'competitive_analysis',
  schema: {
    type: 'object',
    properties: {
      companies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            market_position: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } }
          },
          required: ['name', 'market_position']
        }
      },
      market_leader: {
        type: 'string',
        description: 'Name of the current market leader'
      },
      key_differentiators: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            differentiator: { type: 'string' }
          },
          required: ['company', 'differentiator']
        }
      }
    },
    required: ['companies', 'key_differentiators']
  },
  strict: true
};

/**
 * Person/Entity information schema
 */
export const ENTITY_INFO_SCHEMA = {
  name: 'entity_info',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Full name of the person or entity'
      },
      type: {
        type: 'string',
        enum: ['person', 'company', 'organization', 'unknown'],
        description: 'Type of entity'
      },
      current_position: {
        type: 'string',
        description: 'Current role or position'
      },
      affiliated_organizations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Companies or organizations they are affiliated with'
      },
      key_facts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Important facts about the entity'
      },
      last_updated: {
        type: 'string',
        description: 'When this information was last updated'
      }
    },
    required: ['name', 'type', 'key_facts']
  },
  strict: true
};

/**
 * News summary schema for current events
 */
export const NEWS_SUMMARY_SCHEMA = {
  name: 'news_summary',
  schema: {
    type: 'object',
    properties: {
      headline: {
        type: 'string',
        description: 'Main headline summarizing the news'
      },
      summary: {
        type: 'string',
        description: 'Brief summary of the news'
      },
      key_developments: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key developments or updates'
      },
      impact: {
        type: 'string',
        description: 'Potential impact or significance'
      },
      sentiment: {
        type: 'string',
        enum: ['positive', 'negative', 'neutral', 'mixed'],
        description: 'Overall sentiment of the news'
      },
      related_entities: {
        type: 'array',
        items: { type: 'string' },
        description: 'People, companies, or organizations mentioned'
      }
    },
    required: ['headline', 'summary', 'key_developments', 'sentiment']
  },
  strict: true
};

/**
 * Helper function to detect which schema to use based on query
 */
export function detectBestSchema(query: string): any {
  const lowerQuery = query.toLowerCase();

  // Financial queries
  if (/(revenue|earnings|financials?|quarterly|stock|market cap|profit)/i.test(query)) {
    return FINANCIAL_ANALYSIS_SCHEMA;
  }

  // Competitive analysis
  if (/(compare|vs|versus|competitor|competition|market share)/i.test(query)) {
    return COMPETITIVE_ANALYSIS_SCHEMA;
  }

  // Entity/person queries
  if (/who is|about.*person|biography|career|works? at/i.test(query)) {
    return ENTITY_INFO_SCHEMA;
  }

  // News queries
  if (/(news|latest|recent|announcement|update|happening)/i.test(query)) {
    return NEWS_SUMMARY_SCHEMA;
  }

  // Default: use grounded answer schema
  return GROUNDED_ANSWER_SCHEMA;
}
