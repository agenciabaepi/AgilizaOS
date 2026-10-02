-- Vídeos do aparelho enviados na recepção (QR Code / celular), separados de videos_tecnico.
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS videos_recepcao text;
