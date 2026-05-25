-- Catálogo global: notebooks Lenovo (marca LENOVO, tipo NOTEBOOK)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 488 modelos

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'LENOVO',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    -- ThinkPad X1 Carbon
    ('THINKPAD X1 CARBON'),
    ('THINKPAD X1 CARBON GEN 1'),
    ('THINKPAD X1 CARBON GEN 2'),
    ('THINKPAD X1 CARBON GEN 3'),
    ('THINKPAD X1 CARBON GEN 4'),
    ('THINKPAD X1 CARBON GEN 5'),
    ('THINKPAD X1 CARBON GEN 6'),
    ('THINKPAD X1 CARBON GEN 7'),
    ('THINKPAD X1 CARBON GEN 8'),
    ('THINKPAD X1 CARBON GEN 9'),
    ('THINKPAD X1 CARBON GEN 10'),
    ('THINKPAD X1 CARBON GEN 11'),
    ('THINKPAD X1 CARBON GEN 12'),
    ('THINKPAD X1 CARBON GEN 13'),
    ('THINKPAD X1 CARBON GEN 14 AURA EDITION'),

    -- ThinkPad X1 Yoga
    ('THINKPAD X1 YOGA'),
    ('THINKPAD X1 YOGA GEN 1'),
    ('THINKPAD X1 YOGA GEN 2'),
    ('THINKPAD X1 YOGA GEN 3'),
    ('THINKPAD X1 YOGA GEN 4'),
    ('THINKPAD X1 YOGA GEN 5'),
    ('THINKPAD X1 YOGA GEN 6'),
    ('THINKPAD X1 YOGA GEN 7'),
    ('THINKPAD X1 YOGA GEN 8'),

    -- ThinkPad X1 2-in-1
    ('THINKPAD X1 2-IN-1'),
    ('THINKPAD X1 2-IN-1 GEN 9'),
    ('THINKPAD X1 2-IN-1 GEN 10'),
    ('THINKPAD X1 2-IN-1 GEN 11 AURA EDITION'),

    -- ThinkPad X1 Extreme
    ('THINKPAD X1 EXTREME'),
    ('THINKPAD X1 EXTREME GEN 1'),
    ('THINKPAD X1 EXTREME GEN 2'),
    ('THINKPAD X1 EXTREME GEN 3'),
    ('THINKPAD X1 EXTREME GEN 4'),
    ('THINKPAD X1 EXTREME GEN 5'),

    -- ThinkPad X1 Nano
    ('THINKPAD X1 NANO'),
    ('THINKPAD X1 NANO GEN 1'),
    ('THINKPAD X1 NANO GEN 2'),
    ('THINKPAD X1 NANO GEN 3'),

    -- ThinkPad X9
    ('THINKPAD X9 14 AURA EDITION'),
    ('THINKPAD X9 15 AURA EDITION'),

    -- ThinkPad X12 Detachable
    ('THINKPAD X12 DETACHABLE'),
    ('THINKPAD X12 DETACHABLE GEN 1'),
    ('THINKPAD X12 DETACHABLE GEN 2'),

    -- ThinkPad X13
    ('THINKPAD X13'),
    ('THINKPAD X13 GEN 1'),
    ('THINKPAD X13 GEN 2'),
    ('THINKPAD X13 GEN 3'),
    ('THINKPAD X13 GEN 4'),
    ('THINKPAD X13 GEN 5'),
    ('THINKPAD X13 GEN 6'),
    ('THINKPAD X13 GEN 7'),

    -- ThinkPad X13 Yoga
    ('THINKPAD X13 YOGA'),
    ('THINKPAD X13 YOGA GEN 1'),
    ('THINKPAD X13 YOGA GEN 2'),
    ('THINKPAD X13 YOGA GEN 3'),
    ('THINKPAD X13 YOGA GEN 4'),

    -- ThinkPad X13 2-in-1
    ('THINKPAD X13 2-IN-1'),
    ('THINKPAD X13 2-IN-1 GEN 5'),

    -- ThinkPad X13s
    ('THINKPAD X13S'),

    -- ThinkPad T14
    ('THINKPAD T14'),
    ('THINKPAD T14 GEN 1'),
    ('THINKPAD T14 GEN 2'),
    ('THINKPAD T14 GEN 3'),
    ('THINKPAD T14 GEN 4'),
    ('THINKPAD T14 GEN 5'),
    ('THINKPAD T14 GEN 6'),

    -- ThinkPad T14s
    ('THINKPAD T14S'),
    ('THINKPAD T14S GEN 1'),
    ('THINKPAD T14S GEN 2'),
    ('THINKPAD T14S GEN 3'),
    ('THINKPAD T14S GEN 4'),
    ('THINKPAD T14S GEN 5'),
    ('THINKPAD T14S GEN 6'),

    -- ThinkPad T15
    ('THINKPAD T15'),
    ('THINKPAD T15 GEN 1'),
    ('THINKPAD T15 GEN 2'),

    -- ThinkPad T15g
    ('THINKPAD T15G'),
    ('THINKPAD T15G GEN 1'),
    ('THINKPAD T15G GEN 2'),

    -- ThinkPad T16
    ('THINKPAD T16'),
    ('THINKPAD T16 GEN 1'),
    ('THINKPAD T16 GEN 2'),
    ('THINKPAD T16 GEN 3'),
    ('THINKPAD T16 GEN 4'),

    -- ThinkPad T (legados)
    ('THINKPAD T490'),
    ('THINKPAD T490S'),
    ('THINKPAD T495'),
    ('THINKPAD T495S'),
    ('THINKPAD T480'),
    ('THINKPAD T480S'),
    ('THINKPAD T470'),
    ('THINKPAD T470S'),
    ('THINKPAD T460'),
    ('THINKPAD T460S'),
    ('THINKPAD T450'),
    ('THINKPAD T450S'),
    ('THINKPAD T440'),
    ('THINKPAD T440S'),
    ('THINKPAD T430'),
    ('THINKPAD T420'),
    ('THINKPAD T410'),

    -- ThinkPad E14
    ('THINKPAD E14'),
    ('THINKPAD E14 GEN 1'),
    ('THINKPAD E14 GEN 2'),
    ('THINKPAD E14 GEN 3'),
    ('THINKPAD E14 GEN 4'),
    ('THINKPAD E14 GEN 5'),
    ('THINKPAD E14 GEN 6'),
    ('THINKPAD E14 GEN 7'),

    -- ThinkPad E15
    ('THINKPAD E15'),
    ('THINKPAD E15 GEN 1'),
    ('THINKPAD E15 GEN 2'),
    ('THINKPAD E15 GEN 3'),
    ('THINKPAD E15 GEN 4'),

    -- ThinkPad E16
    ('THINKPAD E16'),
    ('THINKPAD E16 GEN 1'),
    ('THINKPAD E16 GEN 2'),
    ('THINKPAD E16 GEN 3'),

    -- ThinkPad E (legados)
    ('THINKPAD E480'),
    ('THINKPAD E485'),
    ('THINKPAD E490'),
    ('THINKPAD E495'),
    ('THINKPAD E580'),
    ('THINKPAD E585'),
    ('THINKPAD E590'),
    ('THINKPAD E595'),

    -- ThinkPad L13
    ('THINKPAD L13'),
    ('THINKPAD L13 GEN 1'),
    ('THINKPAD L13 GEN 2'),
    ('THINKPAD L13 GEN 3'),
    ('THINKPAD L13 GEN 4'),
    ('THINKPAD L13 GEN 5'),
    ('THINKPAD L13 GEN 6'),

    -- ThinkPad L13 Yoga
    ('THINKPAD L13 YOGA'),
    ('THINKPAD L13 YOGA GEN 1'),
    ('THINKPAD L13 YOGA GEN 2'),
    ('THINKPAD L13 YOGA GEN 3'),
    ('THINKPAD L13 YOGA GEN 4'),
    ('THINKPAD L13 YOGA GEN 5'),

    -- ThinkPad L14
    ('THINKPAD L14'),
    ('THINKPAD L14 GEN 1'),
    ('THINKPAD L14 GEN 2'),
    ('THINKPAD L14 GEN 3'),
    ('THINKPAD L14 GEN 4'),
    ('THINKPAD L14 GEN 5'),
    ('THINKPAD L14 GEN 6'),
    ('THINKPAD L14 GEN 7'),

    -- ThinkPad L15
    ('THINKPAD L15'),
    ('THINKPAD L15 GEN 1'),
    ('THINKPAD L15 GEN 2'),
    ('THINKPAD L15 GEN 3'),
    ('THINKPAD L15 GEN 4'),
    ('THINKPAD L15 GEN 5'),

    -- ThinkPad L16
    ('THINKPAD L16'),
    ('THINKPAD L16 GEN 1'),
    ('THINKPAD L16 GEN 2'),
    ('THINKPAD L16 GEN 3'),

    -- ThinkPad P1
    ('THINKPAD P1'),
    ('THINKPAD P1 GEN 1'),
    ('THINKPAD P1 GEN 2'),
    ('THINKPAD P1 GEN 3'),
    ('THINKPAD P1 GEN 4'),
    ('THINKPAD P1 GEN 5'),
    ('THINKPAD P1 GEN 6'),
    ('THINKPAD P1 GEN 7'),

    -- ThinkPad P14s
    ('THINKPAD P14S'),
    ('THINKPAD P14S GEN 1'),
    ('THINKPAD P14S GEN 2'),
    ('THINKPAD P14S GEN 3'),
    ('THINKPAD P14S GEN 4'),
    ('THINKPAD P14S GEN 5'),
    ('THINKPAD P14S GEN 6'),

    -- ThinkPad P15
    ('THINKPAD P15'),
    ('THINKPAD P15 GEN 1'),
    ('THINKPAD P15 GEN 2'),

    -- ThinkPad P15v
    ('THINKPAD P15V'),
    ('THINKPAD P15V GEN 1'),
    ('THINKPAD P15V GEN 2'),
    ('THINKPAD P15V GEN 3'),

    -- ThinkPad P16
    ('THINKPAD P16'),
    ('THINKPAD P16 GEN 1'),
    ('THINKPAD P16 GEN 2'),
    ('THINKPAD P16 GEN 3'),

    -- ThinkPad P16s
    ('THINKPAD P16S'),
    ('THINKPAD P16S GEN 1'),
    ('THINKPAD P16S GEN 2'),
    ('THINKPAD P16S GEN 3'),
    ('THINKPAD P16S GEN 4'),

    -- ThinkPad P17
    ('THINKPAD P17'),
    ('THINKPAD P17 GEN 1'),
    ('THINKPAD P17 GEN 2'),

    -- ThinkPad P (legados)
    ('THINKPAD P43S'),
    ('THINKPAD P50'),
    ('THINKPAD P51'),
    ('THINKPAD P52'),
    ('THINKPAD P53'),
    ('THINKPAD P70'),
    ('THINKPAD P71'),
    ('THINKPAD P72'),
    ('THINKPAD P73'),

    -- ThinkPad Chromebook
    ('THINKPAD C13 YOGA CHROMEBOOK'),
    ('THINKPAD C14 CHROMEBOOK'),

    -- ThinkBook 13s
    ('THINKBOOK 13S'),
    ('THINKBOOK 13S GEN 2'),
    ('THINKBOOK 13S GEN 3'),
    ('THINKBOOK 13S GEN 4'),

    -- ThinkBook 14
    ('THINKBOOK 14'),
    ('THINKBOOK 14 GEN 2'),
    ('THINKBOOK 14 GEN 3'),
    ('THINKBOOK 14 GEN 4'),
    ('THINKBOOK 14 GEN 5'),
    ('THINKBOOK 14 GEN 6'),
    ('THINKBOOK 14 GEN 7'),

    -- ThinkBook 14s
    ('THINKBOOK 14S'),
    ('THINKBOOK 14S YOGA'),
    ('THINKBOOK 14S YOGA GEN 2'),
    ('THINKBOOK 14S YOGA GEN 3'),

    -- ThinkBook 15
    ('THINKBOOK 15'),
    ('THINKBOOK 15 GEN 2'),
    ('THINKBOOK 15 GEN 3'),
    ('THINKBOOK 15 GEN 4'),

    -- ThinkBook 16
    ('THINKBOOK 16'),
    ('THINKBOOK 16 GEN 4'),
    ('THINKBOOK 16 GEN 5'),
    ('THINKBOOK 16 GEN 6'),
    ('THINKBOOK 16 GEN 7'),

    -- ThinkBook 16p
    ('THINKBOOK 16P'),
    ('THINKBOOK 16P GEN 2'),
    ('THINKBOOK 16P GEN 3'),
    ('THINKBOOK 16P GEN 4'),
    ('THINKBOOK 16P GEN 5'),

    -- ThinkBook Plus
    ('THINKBOOK PLUS'),
    ('THINKBOOK PLUS GEN 2'),
    ('THINKBOOK PLUS GEN 3'),
    ('THINKBOOK PLUS GEN 4'),
    ('THINKBOOK PLUS GEN 5 HYBRID'),
    ('THINKBOOK PLUS GEN 6 ROLLABLE'),

    -- IdeaPad 1
    ('IDEAPAD 1'),
    ('IDEAPAD 1 14'),
    ('IDEAPAD 1 15'),
    ('IDEAPAD 1 15AMN7'),

    -- IdeaPad 3
    ('IDEAPAD 3'),
    ('IDEAPAD 3 14'),
    ('IDEAPAD 3 15'),
    ('IDEAPAD 3 17'),
    ('IDEAPAD 3 14IML05'),
    ('IDEAPAD 3 15IML05'),
    ('IDEAPAD 3 15ITL6'),
    ('IDEAPAD 3 15ALC6'),
    ('IDEAPAD 3 15ADA05'),
    ('IDEAPAD 3 15IIL05'),

    -- IdeaPad 5
    ('IDEAPAD 5'),
    ('IDEAPAD 5 14'),
    ('IDEAPAD 5 15'),
    ('IDEAPAD 5 16'),
    ('IDEAPAD 5 14ITL05'),
    ('IDEAPAD 5 15ITL05'),
    ('IDEAPAD 5 14ALC05'),
    ('IDEAPAD 5 15ALC05'),

    -- IdeaPad 5 2-in-1
    ('IDEAPAD 5 2-IN-1'),
    ('IDEAPAD 5A 2-IN-1 15 GEN 11'),
    ('IDEAPAD 5X 2-IN-1 14 GEN 11'),

    -- IdeaPad Slim
    ('IDEAPAD SLIM 1'),
    ('IDEAPAD SLIM 3'),
    ('IDEAPAD SLIM 3X'),
    ('IDEAPAD SLIM 5'),
    ('IDEAPAD SLIM 5X 13 GEN 11'),
    ('IDEAPAD SLIM 5X 15 GEN 11'),
    ('IDEAPAD SLIM 7'),

    -- IdeaPad Flex
    ('IDEAPAD FLEX 3'),
    ('IDEAPAD FLEX 5'),
    ('IDEAPAD FLEX 5 14'),
    ('IDEAPAD FLEX 5 15'),
    ('IDEAPAD FLEX 5I'),
    ('IDEAPAD FLEX 5I 14'),
    ('IDEAPAD FLEX 5I 15'),

    -- IdeaPad Duet
    ('IDEAPAD DUET 3'),
    ('IDEAPAD DUET 5'),
    ('IDEAPAD DUET 5 CHROMEBOOK'),

    -- IdeaPad (legados)
    ('IDEAPAD S145'),
    ('IDEAPAD S340'),
    ('IDEAPAD S540'),
    ('IDEAPAD 100'),
    ('IDEAPAD 110'),
    ('IDEAPAD 120S'),
    ('IDEAPAD 130'),
    ('IDEAPAD 130S'),
    ('IDEAPAD 310'),
    ('IDEAPAD 320'),
    ('IDEAPAD 330'),
    ('IDEAPAD 330S'),
    ('IDEAPAD 520'),
    ('IDEAPAD 520S'),
    ('IDEAPAD 720S'),

    -- IdeaPad Gaming
    ('IDEAPAD GAMING 3'),
    ('IDEAPAD GAMING 3I'),
    ('IDEAPAD GAMING 3 15'),
    ('IDEAPAD GAMING 3I 15'),
    ('IDEAPAD GAMING 3 15ACH6'),
    ('IDEAPAD GAMING 3I 15IHU6'),

    -- IdeaPad Pro
    ('IDEAPAD PRO 5'),
    ('IDEAPAD PRO 5I'),
    ('IDEAPAD PRO 5I 16 GEN 11'),

    -- Yoga (linhas atuais)
    ('YOGA'),
    ('YOGA 6'),
    ('YOGA 6 13'),
    ('YOGA 7'),
    ('YOGA 7 14'),
    ('YOGA 7 16'),
    ('YOGA 7I'),
    ('YOGA 7I 14'),
    ('YOGA 7I 16'),
    ('YOGA 7A 2-IN-1 14 GEN 11'),
    ('YOGA 7A 2-IN-1 16 GEN 11'),

    -- Yoga 9
    ('YOGA 9'),
    ('YOGA 9I'),
    ('YOGA 9I 14'),
    ('YOGA 9I 2-IN-1'),
    ('YOGA 9I 2-IN-1 AURA EDITION'),

    -- Yoga Pro
    ('YOGA PRO 7'),
    ('YOGA PRO 7I'),
    ('YOGA PRO 7I AURA EDITION 15 GEN 11'),
    ('YOGA PRO 9'),
    ('YOGA PRO 9I'),
    ('YOGA PRO 9I AURA EDITION 16 GEN 11'),

    -- Yoga Slim
    ('YOGA SLIM 6'),
    ('YOGA SLIM 7'),
    ('YOGA SLIM 7I'),
    ('YOGA SLIM 7I ULTRA AURA EDITION 14 GEN 11'),
    ('YOGA SLIM 7X'),
    ('YOGA SLIM 7X 14 GEN 11'),
    ('YOGA SLIM 7A 14 GEN 11'),
    ('YOGA SLIM 9I'),

    -- Yoga Book
    ('YOGA BOOK'),
    ('YOGA BOOK 9I'),
    ('YOGA BOOK 9I GEN 9'),
    ('YOGA BOOK PRO 3D CONCEPT'),

    -- Yoga (legados)
    ('YOGA C630'),
    ('YOGA C640'),
    ('YOGA C740'),
    ('YOGA C940'),
    ('YOGA S740'),
    ('YOGA 520'),
    ('YOGA 530'),
    ('YOGA 720'),
    ('YOGA 730'),
    ('YOGA 900'),
    ('YOGA 910'),
    ('YOGA 920'),
    ('YOGA 930'),

    -- Legion 5
    ('LEGION 5'),
    ('LEGION 5I'),
    ('LEGION 5A'),
    ('LEGION 5 15'),
    ('LEGION 5 16'),
    ('LEGION 5I 15'),
    ('LEGION 5I 16'),
    ('LEGION 5I 15 GEN 10'),
    ('LEGION 5I 15 GEN 11'),
    ('LEGION 5A 15 GEN 11'),

    -- Legion 5 Pro
    ('LEGION 5 PRO'),
    ('LEGION 5I PRO'),
    ('LEGION 5 PRO 16'),
    ('LEGION 5I PRO 16'),

    -- Legion 7
    ('LEGION 7'),
    ('LEGION 7I'),
    ('LEGION 7 16'),
    ('LEGION 7I 16'),

    -- Legion Pro 5
    ('LEGION PRO 5'),
    ('LEGION PRO 5I'),
    ('LEGION PRO 5 16'),
    ('LEGION PRO 5I 16'),

    -- Legion Pro 7
    ('LEGION PRO 7'),
    ('LEGION PRO 7I'),
    ('LEGION PRO 7 16'),
    ('LEGION PRO 7I 16'),

    -- Legion 9
    ('LEGION 9I'),
    ('LEGION 9I 16'),

    -- Legion Slim
    ('LEGION SLIM 5'),
    ('LEGION SLIM 5I'),
    ('LEGION SLIM 7'),
    ('LEGION SLIM 7I'),

    -- Legion (legados)
    ('LEGION Y520'),
    ('LEGION Y530'),
    ('LEGION Y540'),
    ('LEGION Y545'),
    ('LEGION Y7000'),
    ('LEGION Y720'),
    ('LEGION Y730'),
    ('LEGION Y740'),

    -- Legion concept
    ('LEGION PRO ROLLABLE CONCEPT'),

    -- LOQ
    ('LOQ'),
    ('LOQ 15'),
    ('LOQ 16'),
    ('LOQ 15IRH8'),
    ('LOQ 15IAX9'),
    ('LOQ 15IRX9'),
    ('LOQ 15APH8'),
    ('LOQ 15AHP9'),
    ('LOQ 15AHP10'),
    ('LOQ 16IRH8'),
    ('LOQ 16APH8'),

    -- Chromebook
    ('CHROMEBOOK'),
    ('CHROMEBOOK 100E'),
    ('CHROMEBOOK 300E'),
    ('CHROMEBOOK 500E'),
    ('CHROMEBOOK C330'),
    ('CHROMEBOOK C340'),
    ('CHROMEBOOK S330'),
    ('CHROMEBOOK S340'),
    ('FLEX 3 CHROMEBOOK'),
    ('FLEX 5 CHROMEBOOK'),
    ('IDEAPAD 3 CHROMEBOOK'),
    ('IDEAPAD 5 CHROMEBOOK'),
    ('CHROMEBOOK DUET'),
    ('CHROMEBOOK DUET 3'),
    ('CHROMEBOOK DUET 5'),
    ('CHROMEBOOK PLUS 15 GEN 10'),

    -- V Series
    ('V14'),
    ('V14 G1'),
    ('V14 G2'),
    ('V14 G3'),
    ('V14 G4'),
    ('V14 G5'),
    ('V15'),
    ('V15 G1'),
    ('V15 G2'),
    ('V15 G3'),
    ('V15 G4'),
    ('V15 G5'),
    ('V17'),
    ('V17 G2'),
    ('V17 G3'),
    ('V17 G4'),

    -- B Series
    ('B40'),
    ('B50'),
    ('B50-30'),
    ('B50-45'),
    ('B50-70'),
    ('B50-80'),

    -- G40
    ('G40'),
    ('G40-30'),
    ('G40-45'),
    ('G40-70'),
    ('G40-80'),

    -- G50
    ('G50'),
    ('G50-30'),
    ('G50-45'),
    ('G50-70'),
    ('G50-80'),

    -- G (legados)
    ('G400'),
    ('G405'),
    ('G410'),
    ('G480'),
    ('G485'),
    ('G500'),
    ('G505'),
    ('G510'),
    ('G580'),
    ('G585'),

    -- Z Series
    ('Z40'),
    ('Z50'),
    ('Z50-70'),
    ('Z50-75'),

    -- N Series
    ('N22'),
    ('N23'),
    ('N24'),
    ('N42')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
