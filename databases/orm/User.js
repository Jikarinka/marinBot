// Re-export dari connector agar import lama tetap kompatibel
// import User from '../databases/orm/User.js'  → tetap jalan
export { User as default } from '../connector.js';
