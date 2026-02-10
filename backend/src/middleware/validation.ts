import { Request, Response, NextFunction } from 'express';

export function validateFarmerRegistration(req: Request, res: Response, next: NextFunction) {
  const { phone, name, county } = req.body;

  const errors: string[] = [];

  // Validate phone
  if (!phone || !/^07[0-9]{8}$/.test(phone)) {
    errors.push('Tafadhali weka namba ya simu ya Kenya (07xxxxxxxx)');
  }

  // Validate name
  if (!name || name.trim().length < 2) {
    errors.push('Jina linahitaji herufi angalau 2');
  }

  // Validate county
  const kenyanCounties = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu',
    'Machakos', 'Meru', 'Kisii', 'Kakamega', 'Bungoma', 'Busia', 'Other'
  ];

  if (!county || !kenyanCounties.includes(county)) {
    errors.push('Tafadhali chagua kaunti halali ya Kenya');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
}
