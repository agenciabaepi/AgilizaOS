-- Checklist padrão Consert por tipo de equipamento
-- Execute após: equipamentos_tipos_catalogo.sql e checklist_itens_catalogo.sql

-- Tipo "Computador" (sinônimo comum; checklist igual ao Desktop)
INSERT INTO public.equipamentos_tipos_catalogo (codigo, nome, ordem, ativo) VALUES
  ('COMPUTADOR', 'Computador', 15, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  updated_at = now();

-- Macro: insere itens para um código de tipo
CREATE OR REPLACE FUNCTION public._seed_checklist_tipo(
  p_codigo text,
  p_itens jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_tipo_id uuid;
  item jsonb;
BEGIN
  SELECT id INTO v_tipo_id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = upper(trim(p_codigo))
  LIMIT 1;

  IF v_tipo_id IS NULL THEN
    RAISE NOTICE 'Tipo % não encontrado no catálogo — pulando checklist', p_codigo;
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO public.checklist_itens_catalogo (
      tipo_id,
      equipamento_categoria,
      nome,
      descricao,
      categoria,
      ordem,
      obrigatorio,
      ativo
    ) VALUES (
      v_tipo_id,
      upper(trim(p_codigo)),
      item->>'nome',
      NULLIF(item->>'descricao', ''),
      COALESCE(item->>'categoria', 'geral'),
      COALESCE((item->>'ordem')::int, 0),
      COALESCE((item->>'obrigatorio')::boolean, false),
      true
    )
    ON CONFLICT (tipo_id, nome) DO UPDATE SET
      descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      ordem = EXCLUDED.ordem,
      obrigatorio = EXCLUDED.obrigatorio,
      ativo = true,
      equipamento_categoria = EXCLUDED.equipamento_categoria,
      updated_at = now();
  END LOOP;
END;
$$;

-- CELULAR
SELECT public._seed_checklist_tipo('CELULAR', '[
  {"nome":"Tela / Touch","descricao":"Trincas, manchas, responsividade do touch","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Áudio (alto-falante)","descricao":"Som claro, sem chiado","categoria":"audio","ordem":20,"obrigatorio":true},
  {"nome":"Microfone","descricao":"Gravação e chamadas","categoria":"audio","ordem":30,"obrigatorio":false},
  {"nome":"Câmera frontal","categoria":"video","ordem":40,"obrigatorio":false},
  {"nome":"Câmera traseira","categoria":"video","ordem":50,"obrigatorio":false},
  {"nome":"Wi-Fi","categoria":"conectividade","ordem":60,"obrigatorio":false},
  {"nome":"Bluetooth","categoria":"conectividade","ordem":70,"obrigatorio":false},
  {"nome":"Carregamento","descricao":"Conector e indicação de carga","categoria":"energia","ordem":80,"obrigatorio":true},
  {"nome":"Botões (volume/liga)","categoria":"hardware","ordem":90,"obrigatorio":false},
  {"nome":"Biometria / Face ID","categoria":"seguranca","ordem":100,"obrigatorio":false},
  {"nome":"Vibração","categoria":"hardware","ordem":110,"obrigatorio":false}
]'::jsonb);

-- NOTEBOOK
SELECT public._seed_checklist_tipo('NOTEBOOK', '[
  {"nome":"Tela","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Teclado","categoria":"hardware","ordem":20,"obrigatorio":true},
  {"nome":"Touchpad","categoria":"hardware","ordem":30,"obrigatorio":true},
  {"nome":"Wi-Fi","categoria":"conectividade","ordem":40,"obrigatorio":false},
  {"nome":"Bluetooth","categoria":"conectividade","ordem":50,"obrigatorio":false},
  {"nome":"Portas USB","categoria":"conectividade","ordem":60,"obrigatorio":false},
  {"nome":"Áudio / alto-falantes","categoria":"audio","ordem":70,"obrigatorio":false},
  {"nome":"Webcam","categoria":"video","ordem":80,"obrigatorio":false},
  {"nome":"Bateria","categoria":"energia","ordem":90,"obrigatorio":true},
  {"nome":"Carregador","categoria":"energia","ordem":100,"obrigatorio":true}
]'::jsonb);

-- TABLET
SELECT public._seed_checklist_tipo('TABLET', '[
  {"nome":"Tela / Touch","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Wi-Fi","categoria":"conectividade","ordem":20,"obrigatorio":false},
  {"nome":"Bluetooth","categoria":"conectividade","ordem":30,"obrigatorio":false},
  {"nome":"Câmeras","categoria":"video","ordem":40,"obrigatorio":false},
  {"nome":"Áudio","categoria":"audio","ordem":50,"obrigatorio":false},
  {"nome":"Carregamento","categoria":"energia","ordem":60,"obrigatorio":true},
  {"nome":"Botões","categoria":"hardware","ordem":70,"obrigatorio":false}
]'::jsonb);

-- DESKTOP / COMPUTADOR
SELECT public._seed_checklist_tipo('DESKTOP', '[
  {"nome":"Liga / desliga","categoria":"energia","ordem":10,"obrigatorio":true},
  {"nome":"Monitor / vídeo","categoria":"display","ordem":20,"obrigatorio":true},
  {"nome":"Teclado","categoria":"hardware","ordem":30,"obrigatorio":true},
  {"nome":"Mouse","categoria":"hardware","ordem":40,"obrigatorio":true},
  {"nome":"Rede (Wi-Fi ou cabo)","categoria":"conectividade","ordem":50,"obrigatorio":false},
  {"nome":"Portas USB","categoria":"conectividade","ordem":60,"obrigatorio":false},
  {"nome":"Áudio","categoria":"audio","ordem":70,"obrigatorio":false}
]'::jsonb);

SELECT public._seed_checklist_tipo('COMPUTADOR', '[
  {"nome":"Liga / desliga","categoria":"energia","ordem":10,"obrigatorio":true},
  {"nome":"Monitor / vídeo","categoria":"display","ordem":20,"obrigatorio":true},
  {"nome":"Teclado","categoria":"hardware","ordem":30,"obrigatorio":true},
  {"nome":"Mouse","categoria":"hardware","ordem":40,"obrigatorio":true},
  {"nome":"Rede (Wi-Fi ou cabo)","categoria":"conectividade","ordem":50,"obrigatorio":false},
  {"nome":"Portas USB","categoria":"conectividade","ordem":60,"obrigatorio":false},
  {"nome":"Áudio","categoria":"audio","ordem":70,"obrigatorio":false}
]'::jsonb);

-- IMPRESSORA
SELECT public._seed_checklist_tipo('IMPRESSORA', '[
  {"nome":"Liga / desliga","categoria":"energia","ordem":10,"obrigatorio":true},
  {"nome":"Impressão de teste","categoria":"geral","ordem":20,"obrigatorio":true},
  {"nome":"Scanner (se houver)","categoria":"geral","ordem":30,"obrigatorio":false},
  {"nome":"Wi-Fi / USB","categoria":"conectividade","ordem":40,"obrigatorio":false},
  {"nome":"Alimentação de papel","categoria":"hardware","ordem":50,"obrigatorio":false},
  {"nome":"Toner / tinta","categoria":"geral","ordem":60,"obrigatorio":false}
]'::jsonb);

-- SMARTWATCH
SELECT public._seed_checklist_tipo('SMARTWATCH', '[
  {"nome":"Tela / Touch","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Pulseira","categoria":"hardware","ordem":20,"obrigatorio":false},
  {"nome":"Carregamento","categoria":"energia","ordem":30,"obrigatorio":true},
  {"nome":"Bluetooth","categoria":"conectividade","ordem":40,"obrigatorio":false},
  {"nome":"Sensores (batimentos etc.)","categoria":"hardware","ordem":50,"obrigatorio":false}
]'::jsonb);

-- MONITOR
SELECT public._seed_checklist_tipo('MONITOR', '[
  {"nome":"Imagem / pixels mortos","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Botões do painel","categoria":"hardware","ordem":20,"obrigatorio":false},
  {"nome":"Entradas (HDMI, DisplayPort, VGA)","categoria":"conectividade","ordem":30,"obrigatorio":true},
  {"nome":"Áudio integrado (se houver)","categoria":"audio","ordem":40,"obrigatorio":false}
]'::jsonb);

-- TV
SELECT public._seed_checklist_tipo('TV', '[
  {"nome":"Imagem","categoria":"display","ordem":10,"obrigatorio":true},
  {"nome":"Áudio","categoria":"audio","ordem":20,"obrigatorio":true},
  {"nome":"Controle remoto","categoria":"hardware","ordem":30,"obrigatorio":false},
  {"nome":"Entradas HDMI / USB","categoria":"conectividade","ordem":40,"obrigatorio":false},
  {"nome":"Wi-Fi / Smart TV","categoria":"conectividade","ordem":50,"obrigatorio":false}
]'::jsonb);

-- VIDEOGAME / CONSOLE
SELECT public._seed_checklist_tipo('VIDEOGAME', '[
  {"nome":"Liga / inicialização","categoria":"energia","ordem":10,"obrigatorio":true},
  {"nome":"Leitura de mídia / jogos","categoria":"geral","ordem":20,"obrigatorio":true},
  {"nome":"Controles","categoria":"hardware","ordem":30,"obrigatorio":true},
  {"nome":"Saída de vídeo","categoria":"display","ordem":40,"obrigatorio":true},
  {"nome":"Rede / online","categoria":"conectividade","ordem":50,"obrigatorio":false}
]'::jsonb);

SELECT public._seed_checklist_tipo('CONSOLE', '[
  {"nome":"Liga / inicialização","categoria":"energia","ordem":10,"obrigatorio":true},
  {"nome":"Leitura de mídia / jogos","categoria":"geral","ordem":20,"obrigatorio":true},
  {"nome":"Controles","categoria":"hardware","ordem":30,"obrigatorio":true},
  {"nome":"Saída de vídeo","categoria":"display","ordem":40,"obrigatorio":true},
  {"nome":"Rede / online","categoria":"conectividade","ordem":50,"obrigatorio":false}
]'::jsonb);

DROP FUNCTION IF EXISTS public._seed_checklist_tipo(text, jsonb);
