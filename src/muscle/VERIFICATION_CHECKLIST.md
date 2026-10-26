# Muscle Memory verification checklist

A study plan for checking the app against trusted sources one unit at a time. The units follow the lesson order of Proko's [_Anatomy of the Human Body_](https://www.proko.com/course/anatomy-of-the-human-body/lessons). Each unit covers one or two lessons.

## How to use it

1. Watch the Proko lesson(s) for the unit.
2. Open the app module and go through each item:
   - **Shape:** does the highlighted mesh match the source figure from the front, side and back?
   - **Depth:** is the item at the right layer when you peel?
   - **Text:** do the card's name, Latin name and definition hold up?
3. Tick **Visual** when the shape and depth look right. If one is wrong, write what you saw next to the item.
4. Mark anything you're unsure of with ❓. Hand those to an agent to research instead of guessing.

**Fact-check sources:** the Wikipedia article linked from each card (its infobox draws on _Gray's Anatomy_) and [OpenStax _Anatomy & Physiology 2e_](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction), which is free and peer-reviewed. Ch. 1.6 covers the terms, ch. 7–9 the bones and joints, and 11.3–11.6 the muscles by region.

## Text pass (2026-10-26)

An agent checked every item's name, Latin name, definition, attachments, joint type and group against the linked Wikipedia infobox. The **Text** column records the result:

- ✅ matches the source
- 🔧 was wrong, fixed in this pass (see the note)
- ⚠️ simplified or worth a closer look; not wrong

The **Visual** column is yours. No one has checked the 3D meshes yet.

`attachmentFacts.test.ts` now pins every origin → insertion claim to its source, so a new attachment can't ship unchecked.

---

## Unit 1: Language of Anatomy

Proko: _The Basics_ · OpenStax 1.6 and 9.5 · App: **Language of Anatomy**

| Item                                                                  | Text | Visual | Notes                                                                                                                           |
| --------------------------------------------------------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Anatomical position, body planes, directional terms                   | ✅   | ☐      |                                                                                                                                 |
| Movements (flexion, abduction, pronation…)                            | ✅   | ☐      |                                                                                                                                 |
| Origin and insertion                                                  | ✅   | ☐      |                                                                                                                                 |
| Naming words (bi-, tri-, maximus, longus…)                            | ⚠️   | ☐      | The cards call _maximus_, _longus_, etc. "suffixes". They're separate words in the name, but the meaning on each card is right. |
| Joint types (hinge, ball and socket, pivot, ellipsoid, saddle, plane) | ✅   | ☐      |                                                                                                                                 |

## Unit 2: Spine and rib cage

Proko: _Spine_, _Rib Cage_ · OpenStax ch. 7 · App: **Skeletal landmarks**

| Item             | Text | Visual | Notes                                                                                                    |
| ---------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------- |
| Skull            | ✅   | ☐      |                                                                                                          |
| Sternum          | ✅   | ☐      |                                                                                                          |
| Rib cage         | 🔧   | ☐      | Said ribs "arc back and down" from the sternum. Ribs slope **down from the spine** as they wrap forward. |
| Vertebral column | ✅   | ☐      |                                                                                                          |

## Unit 3: Pelvis

Proko: _Pelvis_ · OpenStax 8.3 · App: **Skeletal landmarks**

| Item      | Text | Visual | Notes                                                                                                                       |
| --------- | ---- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Pelvis    | ✅   | ☐      |                                                                                                                             |
| Hip joint | 🔧   | ☐      | Said the joint sits "medial in the pelvis". It sits in the pelvis socket, inside the greater trochanter. Ball and socket ✅ |

## Unit 4: Shoulder bones

Proko: _Shoulder Bones_ · OpenStax 8.1 · App: **Shoulder & neck**, **Skeletal landmarks**

| Item                                 | Text | Visual | Notes |
| ------------------------------------ | ---- | ------ | ----- |
| Clavicle                             | ✅   | ☐      |       |
| Scapula                              | ✅   | ☐      |       |
| Sternoclavicular joint (saddle)      | ✅   | ☐      |       |
| Acromioclavicular joint (plane)      | ✅   | ☐      |       |
| Glenohumeral joint (ball and socket) | ✅   | ☐      |       |

## Unit 5: Pecs

Proko: _Pecs & Breasts_ · OpenStax 11.5 · App: **Torso**

| Item             | Text | Visual | Notes                                                                               |
| ---------------- | ---- | ------ | ----------------------------------------------------------------------------------- |
| Pectoralis major | ⚠️   | ☐      | The origin is shown as the sternum only; the clavicle and rib cartilages count too. |

## Unit 6: Abs and obliques

Proko: _Abs_, _Obliques_, _Torso Drawing_ · OpenStax 11.4 · App: **Torso**

| Item              | Text | Visual | Notes                                                                                                                                                                                                                  |
| ----------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rectus abdominis  | 🔧   | ☐      | **The attachments were reversed.** It runs from the pubis (origin) up to the xiphoid and ribs 5–7 (insertion). The card also said it "compresses on the near side in twist"; it shortens when the torso bends forward. |
| External oblique  | ✅   | ☐      |                                                                                                                                                                                                                        |
| Serratus anterior | ✅   | ☐      |                                                                                                                                                                                                                        |

## Unit 7: Back

Proko: _Upper Back Muscles_, _Lower Back Muscles_ · OpenStax 11.3, 11.5 · App: **Torso**, **Shoulder & neck**

| Item                 | Text | Visual | Notes                                                                                             |
| -------------------- | ---- | ------ | ------------------------------------------------------------------------------------------------- |
| Latissimus dorsi     | ⚠️   | ☐      | The origin is shown as the pelvis only; it also arises from the spine (T7–S5) and the lower ribs. |
| Erector spinae group | ✅   | ☐      |                                                                                                   |
| Rhomboid major       | ✅   | ☐      |                                                                                                   |

## Unit 8: Shoulder muscles

Proko: _Shoulder Muscles_ · OpenStax 11.5 · App: **Shoulder & neck**

| Item          | Text | Visual | Notes                                                                                                   |
| ------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------- |
| Supraspinatus | ✅   | ☐      |                                                                                                         |
| Infraspinatus | ✅   | ☐      | Marked deep (layer 2), but part of it shows at the surface on the back of the shoulder. Check the peel. |
| Teres major   | ✅   | ☐      | Correctly **not** in the rotator cuff group.                                                            |

The app's rotator cuff group lists two of the four muscles. Teres minor and subscapularis aren't study items.

## Unit 9: Neck

Proko: _Neck Muscles_ · OpenStax 11.3 · App: **Shoulder & neck**

| Item                | Text | Visual | Notes |
| ------------------- | ---- | ------ | ----- |
| Sternocleidomastoid | ✅   | ☐      |       |
| Upper trapezius     | ✅   | ☐      |       |

## Unit 10: Arm bones

Proko: _Arm Bones_ · OpenStax 8.2, 9.6 · App: **Skeletal landmarks**, **Arm**

| Item                              | Text | Visual | Notes |
| --------------------------------- | ---- | ------ | ----- |
| Humerus                           | ✅   | ☐      |       |
| Radius                            | ✅   | ☐      |       |
| Ulna                              | ✅   | ☐      |       |
| Elbow joint (hinge)               | ✅   | ☐      |       |
| Proximal radioulnar joint (pivot) | ✅   | ☐      |       |
| Radiocarpal joint (ellipsoid)     | ✅   | ☐      |       |

## Unit 11: Deltoids

Proko: _Deltoids_ · OpenStax 11.5 · App: **Shoulder & neck**

| Item              | Text | Visual | Notes                                                                                                                 |
| ----------------- | ---- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Anterior deltoid  | 🔧   | ☐      | It and the posterior head each called itself "thinner" than the other. Replaced both claims with what each head does. |
| Lateral deltoid   | ✅   | ☐      |                                                                                                                       |
| Posterior deltoid | 🔧   | ☐      | See anterior deltoid.                                                                                                 |

## Unit 12: Biceps and triceps

Proko: _Biceps_, _Triceps_ · OpenStax 11.5 · App: **Arm**

| Item                | Text | Visual | Notes                                                                     |
| ------------------- | ---- | ------ | ------------------------------------------------------------------------- |
| Biceps brachii      | ✅   | ☐      |                                                                           |
| Brachialis          | ✅   | ☐      |                                                                           |
| Triceps (long head) | ✅   | ☐      | The lateral and medial heads aren't study items. Proko teaches all three. |

## Unit 13: Forearms

Proko: _Forearms_ · OpenStax 11.5 · App: **Arm**, **Hand**

| Item                           | Text | Visual | Notes                                                                                                    |
| ------------------------------ | ---- | ------ | -------------------------------------------------------------------------------------------------------- |
| Brachioradialis                | ✅   | ☐      |                                                                                                          |
| Extensor carpi radialis longus | 🔧   | ☐      | It was named "Extensor carpi radialis", but the mesh is the _longus_ only. Renamed it to match.          |
| Flexor carpi radialis          | ✅   | ☐      |                                                                                                          |
| Flexor digitorum superficialis | 🔧   | ☐      | **It sits in the Hand module.** The card described only the tendons; it now names the forearm belly too. |
| Extensor digitorum             | 🔧   | ☐      | **It sits in the Hand module.** Same fix as above.                                                       |

## Unit 14: Hand

Proko: _Hand Bones_, _Hands_ · OpenStax 8.2, 11.5 · App: **Hand**

| Item                       | Text | Visual | Notes                                                                                                             |
| -------------------------- | ---- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Carpals                    | ✅   | ☐      |                                                                                                                   |
| Metacarpals                | ✅   | ☐      |                                                                                                                   |
| Finger phalanges           | 🔧   | ☐      | Said every finger has three segments. The thumb has two.                                                          |
| Thumb CMC joint (saddle)   | ✅   | ☐      |                                                                                                                   |
| Intercarpal joints (plane) | ✅   | ☐      |                                                                                                                   |
| Thenar eminence            | 🔧   | ☐      | The Latin was "Eminence thenar"; it's _eminentia thenaris_.                                                       |
| Hypothenar eminence        | 🔧   | ☐      | The Latin was "Eminence hypothenar"; it's _eminentia hypothenaris_.                                               |
| Flexor pollicis brevis     | 🔧   | ☐      | Now names its thenar neighbours in full: abductor pollicis **brevis** and opponens pollicis.                      |
| Lumbricals                 | 🔧   | ☐      | Said they spread the fingers. That's the interossei. The lumbricals bend the knuckles and straighten the fingers. |
| Dorsal interossei          | ✅   | ☐      |                                                                                                                   |

## Unit 15: Leg bones

Proko: _Leg Bones_ · OpenStax 8.4, 9.6 · App: **Skeletal landmarks**, **Leg**

| Item               | Text | Visual | Notes |
| ------------------ | ---- | ------ | ----- |
| Femur              | ✅   | ☐      |       |
| Tibia              | ✅   | ☐      |       |
| Patella            | ✅   | ☐      |       |
| Knee joint (hinge) | ✅   | ☐      |       |

## Unit 16: Glutes

Proko: _Butt Muscles_ · OpenStax 11.6 · App: **Leg**

| Item                 | Text | Visual | Notes                                                                               |
| -------------------- | ---- | ------ | ----------------------------------------------------------------------------------- |
| Gluteus maximus      | ✅   | ☐      |                                                                                     |
| Gluteus medius       | ✅   | ☐      |                                                                                     |
| Gluteus minimus      | ✅   | ☐      |                                                                                     |
| Tensor fasciae latae | 🔧   | ☐      | Removed "IT band origin" from its other names. The IT band is a separate structure. |

## Unit 17: Thigh

Proko: _Inner Leg Muscles_, _Quadriceps_, _Hamstrings_ · OpenStax 11.6 · App: **Leg**

| Item             | Text | Visual | Notes |
| ---------------- | ---- | ------ | ----- |
| Adductor longus  | ✅   | ☐      |       |
| Rectus femoris   | ✅   | ☐      |       |
| Vastus lateralis | ✅   | ☐      |       |
| Biceps femoris   | ✅   | ☐      |       |

Vastus medialis (the teardrop above the inner knee) and the inner hamstrings are atlas-only, so the quad and hamstring groups are incomplete next to Proko.

## Unit 18: Calf and lower leg

Proko: _Calf Muscles_, _Lower Leg_ · OpenStax 11.6 · App: **Leg**, **Foot**

| Item                | Text | Visual | Notes                                                                                                                                               |
| ------------------- | ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gastrocnemius       | ✅   | ☐      |                                                                                                                                                     |
| Tibialis anterior   | ✅   | ☐      |                                                                                                                                                     |
| Peroneus longus     | 🔧   | ☐      | **It sits in the Foot module.** Said the tendon wraps "to the outer foot". It passes behind the outer ankle and under the sole to the big toe side. |
| Ankle joint (hinge) | ✅   | ☐      |                                                                                                                                                     |

## Unit 19: Foot

Proko: _Foot Bones_, _Feet_ · OpenStax 8.4, 11.6 · App: **Foot**

| Item                      | Text | Visual | Notes                                                                                                                                                            |
| ------------------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calcaneus                 | ✅   | ☐      |                                                                                                                                                                  |
| Talus                     | ✅   | ☐      |                                                                                                                                                                  |
| Tarsals                   | ⚠️   | ☐      | The definition means the midfoot bones (navicular, cuboid, cuneiforms), but "tarsals" normally includes the calcaneus and talus too. Check what the mesh covers. |
| Metatarsals               | ✅   | ☐      |                                                                                                                                                                  |
| Toe phalanges             | ✅   | ☐      |                                                                                                                                                                  |
| Subtalar joint (plane)    | ✅   | ☐      |                                                                                                                                                                  |
| Abductor hallucis         | ✅   | ☐      |                                                                                                                                                                  |
| Flexor digitorum brevis   | 🔧   | ☐      | Said it flexes "the middle toes". It flexes the four small toes.                                                                                                 |
| Lumbricals (foot)         | 🔧   | ☐      | Same mistake as the hand lumbricals.                                                                                                                             |
| Extensor digitorum brevis | ✅   | ☐      |                                                                                                                                                                  |

---

## Left for later

These differ from Proko but aren't errors, so the text pass didn't change them:

- **Modules:** flexor digitorum superficialis and extensor digitorum sit in the Hand module, and peroneus longus in Foot. Moving them would also mean moving their meshes into another module's 3D model.
- **Missing study items:** vastus medialis, the lateral and medial triceps heads, teres minor, subscapularis and the inner hamstrings.
- **Simplified origins:** latissimus dorsi and pectoralis major each show one origin bone where they have several.
