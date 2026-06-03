#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Simple test script to verify OpenAI API key configuration
 * Run with: node scripts/test-openai.js
 */

const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No OPENAI_API_KEY found in .env.local');
    console.log('Please add your OpenAI API key to .env.local');
    console.log('See OPENAI_SETUP.md for instructions');
    process.exit(1);
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format');
    console.log('OpenAI API keys should start with "sk-"');
    console.log('Current value:', apiKey.substring(0, 10) + '...');
    console.log('See OPENAI_SETUP.md for instructions');
    process.exit(1);
  }

  console.log('✅ OpenAI API key format looks correct');
  console.log('Testing API connection...');

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello!" }],
      max_tokens: 10
    });

    console.log('✅ OpenAI API connection successful!');
    console.log('Response:', completion.choices[0]?.message?.content);
  } catch (error) {
    console.error('❌ OpenAI API connection failed:');
    console.error(error.message);
    
    if (error.status === 401) {
      console.log('\n💡 This usually means your API key is invalid or expired.');
      console.log('Please check your API key at: https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.log('\n💡 This means you have exceeded your quota or rate limit.');
      console.log('Please check your usage at: https://platform.openai.com/usage');
    }
    
    process.exit(1);
  }
}

testOpenAI().catch(console.error);
