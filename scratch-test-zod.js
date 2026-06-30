const { z } = require('zod');
const cuid = z.string().cuid();
const text = z.string().min(1);
const createMessage = z.object({
  chatId: z.string(),
  text: text,
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  status: z.enum(['sent', 'delivered', 'read']).optional().default('sent'),
  transport: z.enum(['SMS', 'RCS', 'SIP', 'API', 'WEB']).optional().nullable(),
  senderId: z.string().optional().nullable()
});
console.log(createMessage.safeParse({
  chatId: "clxxxx",
  text: "Hello",
  direction: "OUTBOUND",
  transport: "sms"
}).success);
