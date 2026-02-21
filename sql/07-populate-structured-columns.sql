-- Populate nuclides, reactions, and z_values from the keywords column.
-- Runs entirely server-side — processes all 88k records in one pass.

-- Step 1: Extract nuclides (patterns like "16O", "{+16}O", "208Pb")
-- and reactions (patterns like "(n,gamma)", "(p,p')", "(d,3He)")
UPDATE nsr
SET
  nuclides = sub.nuclides,
  reactions = sub.reactions
FROM (
  SELECT
    id,
    -- Extract nuclides: match {+A}Sym or plain ASym patterns
    COALESCE(
      ARRAY(
        SELECT DISTINCT m[1]
        FROM regexp_matches(keywords, '(\d{1,3}(?:H(?:e|f|g|o|s)?|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Y|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|I|Xe|Cs|Ba|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Er|Tm|Yb|Lu|Ta|W|Re|Os|Ir|Pt|Au|Tl|Pb|Bi|Po|At|Rn|Fr|Ra|Ac|Th|Pa|U|Np|Pu|Am|Cm|Bk|Cf|Es|Fm|Md|No|Lr|Rf|Db|Sg|Bh|Mt|Ds|Rg|Cn|Nh|Fl|Mc|Lv|Ts|Og))\b', 'g') AS m
        WHERE m[1] ~ '^\d+[A-Z][a-z]?$'
          AND (m[1])::text !~ '^0'
          AND substring(m[1] FROM '^\d+')::int BETWEEN 1 AND 300
      ),
      '{}'
    ) AS nuclides,
    -- Extract reactions: match (X,Y) patterns
    COALESCE(
      ARRAY(
        SELECT DISTINCT m[1]
        FROM regexp_matches(keywords, '(\([a-zA-Z0-9α]+,[a-zA-Z0-9α'' ]+\))', 'g') AS m
      ),
      '{}'
    ) AS reactions
  FROM nsr
  WHERE keywords IS NOT NULL AND keywords != ''
) AS sub
WHERE nsr.id = sub.id;

-- Step 2: Build z_values lookup from nuclides using an element→Z mapping
-- We use a CTE with all elements
WITH element_z(sym, z) AS (
  VALUES
    ('H',1),('He',2),('Li',3),('Be',4),('B',5),('C',6),('N',7),('O',8),
    ('F',9),('Ne',10),('Na',11),('Mg',12),('Al',13),('Si',14),('P',15),
    ('S',16),('Cl',17),('Ar',18),('K',19),('Ca',20),('Sc',21),('Ti',22),
    ('V',23),('Cr',24),('Mn',25),('Fe',26),('Co',27),('Ni',28),('Cu',29),
    ('Zn',30),('Ga',31),('Ge',32),('As',33),('Se',34),('Br',35),('Kr',36),
    ('Rb',37),('Sr',38),('Y',39),('Zr',40),('Nb',41),('Mo',42),('Tc',43),
    ('Ru',44),('Rh',45),('Pd',46),('Ag',47),('Cd',48),('In',49),('Sn',50),
    ('Sb',51),('Te',52),('I',53),('Xe',54),('Cs',55),('Ba',56),('La',57),
    ('Ce',58),('Pr',59),('Nd',60),('Pm',61),('Sm',62),('Eu',63),('Gd',64),
    ('Tb',65),('Dy',66),('Ho',67),('Er',68),('Tm',69),('Yb',70),('Lu',71),
    ('Hf',72),('Ta',73),('W',74),('Re',75),('Os',76),('Ir',77),('Pt',78),
    ('Au',79),('Hg',80),('Tl',81),('Pb',82),('Bi',83),('Po',84),('At',85),
    ('Rn',86),('Fr',87),('Ra',88),('Ac',89),('Th',90),('Pa',91),('U',92),
    ('Np',93),('Pu',94),('Am',95),('Cm',96),('Bk',97),('Cf',98),('Es',99),
    ('Fm',100),('Md',101),('No',102),('Lr',103),('Rf',104),('Db',105),
    ('Sg',106),('Bh',107),('Hs',108),('Mt',109),('Ds',110),('Rg',111),
    ('Cn',112),('Nh',113),('Fl',114),('Mc',115),('Lv',116),('Ts',117),('Og',118)
)
UPDATE nsr
SET z_values = sub.z_arr
FROM (
  SELECT
    n.id,
    ARRAY(
      SELECT DISTINCT ez.z
      FROM unnest(n.nuclides) AS nuc
      JOIN element_z ez ON ez.sym = substring(nuc FROM '[A-Z][a-z]?$')
      ORDER BY ez.z
    ) AS z_arr
  FROM nsr n
  WHERE n.nuclides IS NOT NULL AND array_length(n.nuclides, 1) > 0
) AS sub
WHERE nsr.id = sub.id;
