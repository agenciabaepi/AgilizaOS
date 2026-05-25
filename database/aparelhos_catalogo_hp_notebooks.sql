-- Catálogo global: notebooks HP (marca HP, tipo NOTEBOOK)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 271 modelos

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'HP',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    -- HP 14
    ('14'),
    ('14S'),
    ('14-DQ'),
    ('14-DK'),
    ('14-CF'),
    ('14-CM'),
    ('14-BS'),
    ('14-BW'),
    ('14-AM'),
    ('14-AC'),
    ('14-AN'),

    -- HP 15
    ('15'),
    ('15S'),
    ('15-DW'),
    ('15-DY'),
    ('15-DA'),
    ('15-DB'),
    ('15-BS'),
    ('15-BW'),
    ('15-AY'),
    ('15-AC'),
    ('15-AF'),
    ('15-G'),
    ('15-R'),
    ('15-F'),
    ('15-N'),
    ('15-P'),

    -- HP 17
    ('17'),
    ('17-BY'),
    ('17-BS'),
    ('17-X'),
    ('17-Y'),
    ('17-P'),

    -- HP 240
    ('240 G1'),
    ('240 G2'),
    ('240 G3'),
    ('240 G4'),
    ('240 G5'),
    ('240 G6'),
    ('240 G7'),
    ('240 G8'),
    ('240 G9'),
    ('240 G10'),

    -- HP 245
    ('245 G1'),
    ('245 G2'),
    ('245 G3'),
    ('245 G4'),
    ('245 G5'),
    ('245 G6'),
    ('245 G7'),
    ('245 G8'),
    ('245 G9'),
    ('245 G10'),

    -- HP 246
    ('246 G1'),
    ('246 G2'),
    ('246 G3'),
    ('246 G4'),
    ('246 G5'),
    ('246 G6'),
    ('246 G7'),
    ('246 G8'),

    -- HP 250
    ('250 G1'),
    ('250 G2'),
    ('250 G3'),
    ('250 G4'),
    ('250 G5'),
    ('250 G6'),
    ('250 G7'),
    ('250 G8'),
    ('250 G9'),
    ('250 G10'),

    -- HP 255
    ('255 G1'),
    ('255 G2'),
    ('255 G3'),
    ('255 G4'),
    ('255 G5'),
    ('255 G6'),
    ('255 G7'),
    ('255 G8'),
    ('255 G9'),
    ('255 G10'),

    -- HP 256
    ('256 G1'),
    ('256 G2'),
    ('256 G3'),
    ('256 G4'),
    ('256 G5'),
    ('256 G6'),
    ('256 G7'),
    ('256 G8'),

    -- Pavilion 14
    ('PAVILION 14'),
    ('PAVILION 14-CE'),
    ('PAVILION 14-DV'),
    ('PAVILION 14-EC'),
    ('PAVILION 14-AL'),
    ('PAVILION 14-AB'),
    ('PAVILION 14-BF'),
    ('PAVILION 14-V'),
    ('PAVILION 14-N'),

    -- Pavilion 15
    ('PAVILION 15'),
    ('PAVILION 15-EG'),
    ('PAVILION 15-EH'),
    ('PAVILION 15-CS'),
    ('PAVILION 15-CW'),
    ('PAVILION 15-CC'),
    ('PAVILION 15-CD'),
    ('PAVILION 15-AB'),
    ('PAVILION 15-AU'),
    ('PAVILION 15-AW'),
    ('PAVILION 15-P'),
    ('PAVILION 15-N'),

    -- Pavilion 17
    ('PAVILION 17'),
    ('PAVILION 17-G'),
    ('PAVILION 17-F'),
    ('PAVILION 17-E'),
    ('PAVILION 17-AB'),
    ('PAVILION 17-AR'),
    ('PAVILION 17-BY'),

    -- Pavilion X360
    ('PAVILION X360 11'),
    ('PAVILION X360 13'),
    ('PAVILION X360 14'),
    ('PAVILION X360 15'),

    -- Pavilion Gaming
    ('PAVILION GAMING 15'),
    ('PAVILION GAMING 16'),
    ('PAVILION GAMING 17'),

    -- Envy
    ('ENVY 13'),
    ('ENVY 14'),
    ('ENVY 15'),
    ('ENVY 17'),
    ('ENVY X360 13'),
    ('ENVY X360 14'),
    ('ENVY X360 15'),
    ('ENVY X360 16'),

    -- Spectre
    ('SPECTRE 13'),
    ('SPECTRE 14'),
    ('SPECTRE 15'),
    ('SPECTRE X2'),
    ('SPECTRE X360 13'),
    ('SPECTRE X360 14'),
    ('SPECTRE X360 15'),
    ('SPECTRE X360 16'),
    ('SPECTRE FOLIO'),

    -- Stream
    ('STREAM 11'),
    ('STREAM 13'),
    ('STREAM 14'),
    ('STREAM X360 11'),
    ('STREAM X360 13'),

    -- Mini
    ('MINI 1000'),
    ('MINI 110'),
    ('MINI 210'),
    ('MINI 2140'),
    ('MINI 5101'),
    ('MINI 5102'),
    ('MINI 5103'),

    -- ProBook 430
    ('PROBOOK 430 G1'),
    ('PROBOOK 430 G2'),
    ('PROBOOK 430 G3'),
    ('PROBOOK 430 G4'),
    ('PROBOOK 430 G5'),
    ('PROBOOK 430 G6'),
    ('PROBOOK 430 G7'),
    ('PROBOOK 430 G8'),

    -- ProBook 440
    ('PROBOOK 440 G1'),
    ('PROBOOK 440 G2'),
    ('PROBOOK 440 G3'),
    ('PROBOOK 440 G4'),
    ('PROBOOK 440 G5'),
    ('PROBOOK 440 G6'),
    ('PROBOOK 440 G7'),
    ('PROBOOK 440 G8'),
    ('PROBOOK 440 G9'),
    ('PROBOOK 440 G10'),
    ('PROBOOK 440 G11'),

    -- ProBook 445
    ('PROBOOK 445 G6'),
    ('PROBOOK 445 G7'),
    ('PROBOOK 445 G8'),
    ('PROBOOK 445 G9'),
    ('PROBOOK 445 G10'),
    ('PROBOOK 445 G11'),

    -- ProBook 450
    ('PROBOOK 450 G1'),
    ('PROBOOK 450 G2'),
    ('PROBOOK 450 G3'),
    ('PROBOOK 450 G4'),
    ('PROBOOK 450 G5'),
    ('PROBOOK 450 G6'),
    ('PROBOOK 450 G7'),
    ('PROBOOK 450 G8'),
    ('PROBOOK 450 G9'),
    ('PROBOOK 450 G10'),
    ('PROBOOK 450 G11'),

    -- ProBook 455
    ('PROBOOK 455 G6'),
    ('PROBOOK 455 G7'),
    ('PROBOOK 455 G8'),
    ('PROBOOK 455 G9'),
    ('PROBOOK 455 G10'),
    ('PROBOOK 455 G11'),

    -- ProBook 470
    ('PROBOOK 470 G1'),
    ('PROBOOK 470 G2'),
    ('PROBOOK 470 G3'),
    ('PROBOOK 470 G4'),
    ('PROBOOK 470 G5'),
    ('PROBOOK 470 G6'),
    ('PROBOOK 470 G7'),
    ('PROBOOK 470 G8'),

    -- EliteBook 820
    ('ELITEBOOK 820 G1'),
    ('ELITEBOOK 820 G2'),
    ('ELITEBOOK 820 G3'),
    ('ELITEBOOK 820 G4'),

    -- EliteBook 830
    ('ELITEBOOK 830 G5'),
    ('ELITEBOOK 830 G6'),
    ('ELITEBOOK 830 G7'),
    ('ELITEBOOK 830 G8'),
    ('ELITEBOOK 830 G9'),
    ('ELITEBOOK 830 G10'),
    ('ELITEBOOK 830 G11'),

    -- EliteBook 840
    ('ELITEBOOK 840 G1'),
    ('ELITEBOOK 840 G2'),
    ('ELITEBOOK 840 G3'),
    ('ELITEBOOK 840 G4'),
    ('ELITEBOOK 840 G5'),
    ('ELITEBOOK 840 G6'),
    ('ELITEBOOK 840 G7'),
    ('ELITEBOOK 840 G8'),
    ('ELITEBOOK 840 G9'),
    ('ELITEBOOK 840 G10'),
    ('ELITEBOOK 840 G11'),

    -- EliteBook 850
    ('ELITEBOOK 850 G1'),
    ('ELITEBOOK 850 G2'),
    ('ELITEBOOK 850 G3'),
    ('ELITEBOOK 850 G4'),
    ('ELITEBOOK 850 G5'),
    ('ELITEBOOK 850 G6'),
    ('ELITEBOOK 850 G7'),
    ('ELITEBOOK 850 G8'),
    ('ELITEBOOK 850 G9'),
    ('ELITEBOOK 850 G10'),
    ('ELITEBOOK 850 G11'),

    -- ZBook
    ('ZBOOK 14'),
    ('ZBOOK 15'),
    ('ZBOOK 17'),
    ('ZBOOK 14U'),
    ('ZBOOK 15U'),
    ('ZBOOK FIREFLY 14'),
    ('ZBOOK FIREFLY 15'),
    ('ZBOOK FIREFLY 16'),
    ('ZBOOK STUDIO'),
    ('ZBOOK POWER'),
    ('ZBOOK FURY 15'),
    ('ZBOOK FURY 16'),
    ('ZBOOK FURY 17'),

    -- Omen
    ('OMEN 15'),
    ('OMEN 16'),
    ('OMEN 17'),
    ('OMEN X 2S'),
    ('OMEN TRANSCEND 14'),
    ('OMEN TRANSCEND 16'),
    ('OMEN MAX 16'),

    -- Victus
    ('VICTUS 15'),
    ('VICTUS 16'),

    -- Chromebook
    ('CHROMEBOOK 11'),
    ('CHROMEBOOK 14'),
    ('CHROMEBOOK X360 11'),
    ('CHROMEBOOK X360 12'),
    ('CHROMEBOOK X360 14'),
    ('CHROMEBOOK X2'),
    ('CHROMEBOOK PLUS 14'),

    -- OmniBook
    ('OMNIBOOK 3'),
    ('OMNIBOOK 5'),
    ('OMNIBOOK 7'),
    ('OMNIBOOK X'),
    ('OMNIBOOK ULTRA'),
    ('OMNIBOOK ULTRA FLIP'),
    ('OMNIBOOK ULTRA 14')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
