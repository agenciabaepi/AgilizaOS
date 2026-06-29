-- Habilita Supabase Realtime no CRM WhatsApp
-- Execute no Supabase SQL Editor após 001 e 002

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversa_notas;
