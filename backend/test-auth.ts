import dotenv from 'dotenv';
import { generateToken } from './src/middleware/auth';
import jwt from 'jsonwebtoken';

dotenv.config();

// Test token generation for Kenyan farmer
const testToken = generateToken('farm123', '0712345678');
console.log('Test token for Kenyan farmer:', testToken);
console.log('\nDecoded payload:');
const decoded = jwt.decode(testToken);
console.log(decoded);
