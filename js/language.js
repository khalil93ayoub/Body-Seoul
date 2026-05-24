(function () {
    const storageKey = "bodySeoulLanguage";
    const originalText = new WeakMap();
    const originalAttributes = new WeakMap();
    let observer = null;
    let activeLanguage = readLanguage();
    let applying = false;

    const translations = {
        "Livraison partout au Maroc dès 249 DHS": "توصيل في جميع أنحاء المغرب ابتداء من 249 درهم",
        "Authentiques": "أصلية",
        "Coréens": "كورية",
        "Efficaces": "فعالة",
        "Nos magasins": "متاجرنا",
        "Compte": "حسابي",
        "Favoris": "المفضلة",
        "Panier": "السلة",
        "Voir tout": "عرض الكل",
        "Voir le panier": "عرض السلة",
        "Passer au checkout": "إتمام الطلب",
        "Total": "المجموع",
        "Nettoyants": "منظفات",
        "Contour des Yeux": "محيط العين",
        "Crèmes": "كريمات",
        "Protection Solaire": "واقي الشمس",
        "Exfoliation & Pads": "التقشير والبادز",
        "Kits": "المجموعات",
        "Catégories": "الفئات",
        "Tous les produits": "كل المنتجات",
        "Découvrez toute notre sélection de soins coréens pour construire votre routine complète.": "اكتشفي مجموعتنا الكاملة من العناية الكورية لبناء روتينك الكامل.",
        "Accueil": "الرئيسية",
        "LA BEAUTÉ CORÉENNE, POUR VOUS": "الجمال الكوري لأجلك",
        "Glow Different.": "تألقي بطريقة مختلفة.",
        "Glow Korean.": "تألقي على الطريقة الكورية.",
        "Découvrez des soins innovants pour une peau saine, lumineuse et éclatante.": "اكتشفي عناية مبتكرة لبشرة صحية ومشرقة ومتوهجة.",
        "Découvrir maintenant": "اكتشفي الآن",
        "Voir les best-sellers": "شاهدي الأكثر مبيعا",
        "Produits 100% authentiques": "منتجات أصلية 100%",
        "Importés directement de Corée": "مستوردة مباشرة من كوريا",
        "Livraison rapide au Maroc": "توصيل سريع داخل المغرب",
        "Partout, dès 249 DHS": "في كل المدن، ابتداء من 249 درهم",
        "Échantillons offerts": "عينات مجانية",
        "À chaque commande": "مع كل طلب",
        "Paiement sécurisé": "دفع آمن",
        "Carte, COD & plus": "بطاقة، الدفع عند الاستلام وأكثر",
        "Nouveautés": "وصل حديثا",
        "Les derniers arrivages tout droit de Corée": "أحدث المنتجات مباشرة من كوريا",
        "Best-Sellers": "الأكثر مبيعا",
        "Best-seller": "الأكثر مبيعا",
        "BEST-SELLER": "الأكثر مبيعا",
        "Les produits préférés de notre communauté": "المنتجات المفضلة لدى مجتمعنا",
        "Votre meilleur allié au quotidien": "حليفك اليومي الأفضل",
        "Offres du Moment": "عروض الآن",
        "Des promotions à ne pas manquer": "تخفيضات لا تفوت",
        "Découvrez notre sélection de nettoyants doux et efficaces pour une peau propre et équilibrée.": "اكتشفي تشكيلتنا من المنظفات اللطيفة والفعالة لبشرة نظيفة ومتوازنة.",
        "Le premier pas vers une peau saine et lumineuse": "الخطوة الأولى نحو بشرة صحية ومشرقة",
        "DÉCOUVRIR LA ROUTINE": "اكتشفي الروتين",
        "FILTRES": "الفلاتر",
        "Réinitialiser": "إعادة ضبط",
        "TYPE DE PEAU": "نوع البشرة",
        "Tous": "الكل",
        "Sèche": "جافة",
        "Mixte": "مختلطة",
        "Grasse": "دهنية",
        "Sensible": "حساسة",
        "PROBLÈMES DE PEAU": "مشاكل البشرة",
        "Cernes": "هالات",
        "Poches": "انتفاخات",
        "Rides": "تجاعيد",
        "Déshydratation": "جفاف",
        "TEXTURE": "القوام",
        "Sérum": "سيروم",
        "Crème": "كريم",
        "Gel": "جل",
        "Trier par :": "ترتيب حسب:",
        "Meilleures ventes": "الأكثر مبيعا",
        "Prix croissant": "السعر من الأقل إلى الأعلى",
        "Prix décroissant": "السعر من الأعلى إلى الأقل",
        "Voir le produit": "عرض المنتج",
        "Ajouter au panier": "أضيفي إلى السلة",
        "AJOUTER AU PANIER": "أضيفي إلى السلة",
        "Produit ajouté au panier !": "تمت إضافة المنتج إلى السلة!",
        "Vegan": "نباتي",
        "VEGAN": "نباتي",
        "Livraison rapide": "توصيل سريع",
        "Partout au Maroc": "في جميع أنحاء المغرب",
        "Produit authentique": "منتج أصلي",
        "Description": "الوصف",
        "Conseils d’utilisation": "طريقة الاستخدام",
        "Conseils d'Utilisation": "طريقة الاستخدام",
        "Ingrédients clés": "المكونات الرئيسية",
        "Ingrédients": "المكونات",
        "Quantité": "الكمية",
        "Livraison rapide • Paiement à la livraison disponible": "توصيل سريع • الدفع عند الاستلام متاح",
        "Votre Panier": "سلتك",
        "Votre liste de favoris": "قائمة المفضلة",
        "Continuer vers le paiement": "المتابعة للدفع",
        "Supprimer du panier": "حذف من السلة",
        "Retirer des favoris": "إزالة من المفضلة",
        "Ajouter au panier depuis les favoris": "إضافة إلى السلة من المفضلة",
        "Panier vide": "السلة فارغة",
        "Aucun favori pour le moment.": "لا توجد منتجات مفضلة حاليا.",
        "Checkout": "الدفع",
        "Finaliser la commande": "إتمام الطلب",
        "Confirmer la commande": "تأكيد الطلب",
        "Résumé de la commande": "ملخص الطلب",
        "Vos produits": "منتجاتك",
        "Étape 1": "الخطوة 1",
        "Étape 2": "الخطوة 2",
        "Vérifiez votre panier avant de finaliser la commande.": "راجعي سلتك قبل إتمام الطلب.",
        "Renseignez vos informations de livraison.": "أدخلي معلومات التوصيل الخاصة بك.",
        "Vos Favoris": "المفضلة لديك",
        "Votre panier est vide.": "سلتك فارغة.",
        "Produit introuvable.": "لم يتم العثور على المنتج.",
        "Paiement": "الدفع",
        "© 2025 Body & Seoul — Tous droits réservés": "© 2025 Body & Seoul — جميع الحقوق محفوظة"
    };


    Object.assign(translations, {
        "Une crème coréenne ultra-hydratante enrichie en acide hyaluronique et Centella Asiatica pour nourrir, protéger et illuminer la peau.": "كريم كوري فائق الترطيب غني بحمض الهيالورونيك والسيكا لتغذية البشرة وحمايتها ومنحها إشراقة.",
        "Hydratation intense": "ترطيب مكثف",
        "Effet glow naturel": "إشراقة طبيعية",
        "Texture légère non grasse": "قوام خفيف غير دهني",
        "Convient aux peaux sensibles": "مناسب للبشرة الحساسة",
        "Cette crème aide à renforcer la barrière cutanée, hydrate durablement et améliore l’éclat naturel de la peau.": "يساعد هذا الكريم على تقوية حاجز البشرة، وترطيبها طويلا، وتحسين إشراقتها الطبيعية.",
        "Appliquer matin et soir après le sérum. Masser délicatement jusqu’à absorption complète.": "يوضع صباحا ومساء بعد السيروم، ثم يدلك بلطف حتى يمتص بالكامل.",
        "Acide Hyaluronique, Centella Asiatica, Niacinamide, Thé Vert, Céramides.": "حمض الهيالورونيك، سنتيلا أسياتيكا، نياسيناميد، الشاي الأخضر، سيراميدات.",
        "Un sérum coréen au rétinol conçu pour raffermir la peau, améliorer l’élasticité et réduire l’apparence des ridules tout en gardant une texture légère et confortable.": "سيروم كوري بالريتينول مصمم لشد البشرة وتحسين مرونتها وتقليل مظهر الخطوط الرفيعة بقوام خفيف ومريح.",
        "Effet raffermissant visible": "تأثير شد واضح",
        "Améliore l’élasticité de la peau": "يحسن مرونة البشرة",
        "Aide à réduire les ridules": "يساعد على تقليل الخطوط الرفيعة",
        "Texture légère et rapide à absorber": "قوام خفيف سريع الامتصاص",
        "Le Retinol Shot Tightening Serum aide à raffermir la peau et améliorer sa texture grâce à une formule enrichie en actifs anti-âge puissants.": "يساعد سيروم Retinol Shot Tightening على شد البشرة وتحسين ملمسها بفضل تركيبة غنية بمكونات فعالة لمقاومة علامات التقدم في السن.",
        "Appliquer quelques gouttes le soir sur peau propre après le toner. Utiliser progressivement et appliquer une protection solaire le matin.": "توضع بضع قطرات مساء على بشرة نظيفة بعد التونر. يستخدم تدريجيا مع وضع واقي شمس صباحا.",
        "Rétinol, Peptides, Niacinamide, Acide Hyaluronique, Extraits apaisants.": "ريتينول، ببتيدات، نياسيناميد، حمض الهيالورونيك، مستخلصات مهدئة.",
        "Un écran solaire coréen ultra-léger à texture sérum qui protège efficacement contre les UVA et UVB grâce à un SPF50+ PA++++. Sa formule Hyalu-Cica hydrate, apaise et laisse un fini lumineux sans effet blanc ni sensation collante.": "واقي شمس كوري فائق الخفة بقوام سيروم يحمي بفعالية من أشعة UVA وUVB بعامل SPF50+ PA++++. تركيبة Hyalu-Cica ترطب وتهدئ وتترك لمسة مشرقة دون طبقة بيضاء أو إحساس لزج.",
        "Protection SPF50+ PA++++": "حماية SPF50+ PA++++",
        "Texture sérum ultra légère": "قوام سيروم فائق الخفة",
        "Aucun effet blanc": "بدون أثر أبيض",
        "Hydratant et apaisant": "مرطب ومهدئ",
        "Le Hyalu-Cica Water-Fit Sun Serum combine une haute protection solaire avec une texture hydratante légère. Il protège la peau des agressions UV tout en maintenant l’hydratation et le confort de la peau.": "يجمع Hyalu-Cica Water-Fit Sun Serum بين حماية عالية من الشمس وقوام مرطب خفيف، ليحمي البشرة من الأشعة ويحافظ على ترطيبها وراحتها.",
        "Appliquer généreusement comme dernière étape de la routine skincare sur le visage et les zones exposées au soleil. Renouveler l’application si nécessaire.": "يوضع بسخاء كآخر خطوة في روتين العناية على الوجه والمناطق المعرضة للشمس، ويعاد تطبيقه عند الحاجة.",
        "Centella Asiatica, Acide Hyaluronique, Niacinamide, Extraits de pousses végétales, Thé Vert, Adenosine.": "سنتيلا أسياتيكا، حمض الهيالورونيك، نياسيناميد، مستخلصات براعم نباتية، الشاي الأخضر، أدينوسين.",
        "Un nettoyant gel doux au pH faible qui nettoie efficacement la peau sans la dessécher. Il aide à éliminer les impuretés, l’excès de sébum et à maintenir l’équilibre naturel de la peau.": "منظف جل لطيف بدرجة حموضة منخفضة ينظف البشرة بفعالية دون أن يسبب الجفاف، ويساعد على إزالة الشوائب والدهون الزائدة والحفاظ على توازن البشرة الطبيعي.",
        "Nettoyage doux au pH faible": "تنظيف لطيف بدرجة حموضة منخفضة",
        "Élimine l’excès de sébum": "يزيل الدهون الزائدة",
        "N’assèche pas la peau": "لا يجفف البشرة",
        "Le Low pH Good Morning Gel Cleanser de COSRX nettoie la peau tout en respectant son équilibre naturel grâce à son pH faible. Sa formule aide à garder une peau fraîche, propre et confortable au quotidien.": "ينظف Low pH Good Morning Gel Cleanser من COSRX البشرة مع احترام توازنها الطبيعي بفضل درجة الحموضة المنخفضة، ويساعد على إبقائها منتعشة ونظيفة ومريحة يوميا.",
        "Appliquer une petite quantité sur peau humide. Masser délicatement puis rincer à l’eau tiède. Utiliser matin et soir.": "توضع كمية صغيرة على بشرة مبللة، تدلك بلطف ثم تشطف بالماء الفاتر. يستخدم صباحا ومساء.",
        "Huile d’Arbre à Thé, BHA naturel, Extraits botaniques, Agents nettoyants doux, Actifs apaisants.": "زيت شجرة الشاي، BHA طبيعي، مستخلصات نباتية، عوامل تنظيف لطيفة، مكونات مهدئة.",
        "Un sérum coréen illuminateur enrichi en PDRN et peptides pour améliorer l’élasticité, hydrater intensément et donner un effet glow éclatant à la peau.": "سيروم كوري مضيء غني بـ PDRN والببتيدات لتحسين المرونة وترطيب البشرة بعمق ومنحها إشراقة لامعة.",
        "Effet glow immédiat": "إشراقة فورية",
        "Texture légère et soyeuse": "قوام خفيف وحريري",
        "Le PDRN Pink Peptide Serum aide à revitaliser les peaux ternes et fatiguées. Sa formule nourrit, hydrate et améliore l’apparence générale de la peau pour un teint lumineux.": "يساعد PDRN Pink Peptide Serum على إنعاش البشرة الباهتة والمتعبة. تركيبته تغذي وترطب وتحسن مظهر البشرة للحصول على لون أكثر إشراقا.",
        "Après le nettoyage et le toner, appliquer quelques gouttes sur le visage. Masser délicatement jusqu’à absorption complète.": "بعد التنظيف والتونر، توضع بضع قطرات على الوجه وتدلك بلطف حتى تمتص بالكامل.",
        "PDRN, Complexe de Peptides, Niacinamide, Acide Hyaluronique, Extraits apaisants coréens.": "PDRN، مركب ببتيدات، نياسيناميد، حمض الهيالورونيك، مستخلصات كورية مهدئة.",
        "Une crème apaisante coréenne spécialement formulée pour calmer les irritations, renforcer la barrière cutanée et hydrater intensément les peaux sensibles ou fragilisées.": "كريم كوري مهدئ صمم خصيصا لتهدئة التهيج وتقوية حاجز البشرة وترطيب البشرة الحساسة أو الضعيفة بعمق.",
        "Apaise les rougeurs et irritations": "يهدئ الاحمرار والتهيج",
        "Hydratation profonde et durable": "ترطيب عميق وطويل الأمد",
        "Renforce la barrière cutanée": "يقوي حاجز البشرة",
        "Texture légère et confortable": "قوام خفيف ومريح",
        "La 345 Relief Cream de Dr. Althea aide à calmer la peau sensible et irritée grâce à une formule enrichie en ingrédients apaisants et hydratants. Elle laisse la peau douce, équilibrée et confortable.": "يساعد كريم 345 Relief Cream من Dr. Althea على تهدئة البشرة الحساسة والمتهيجة بتركيبة غنية بمكونات مهدئة ومرطبة، ويترك البشرة ناعمة ومتوازنة ومريحة.",
        "Appliquer une quantité adaptée comme dernière étape de la routine skincare. Masser délicatement jusqu’à absorption complète.": "توضع كمية مناسبة كآخر خطوة في روتين العناية بالبشرة، ثم تدلك بلطف حتى تمتص بالكامل.",
        "Centella Asiatica, Panthénol, Céramides, Niacinamide, Extraits botaniques apaisants.": "سنتيلا أسياتيكا، بانثينول، سيراميدات، نياسيناميد، مستخلصات نباتية مهدئة.",
        "Une crème solaire coréenne légère et hydratante avec SPF50+ PA++++ enrichie en extrait de riz (30%) et probiotiques fermentés. Elle protège efficacement contre les UV tout en nourrissant, apaisant et renforçant la barrière cutanée.": "كريم واقي شمس كوري خفيف ومرطب بعامل SPF50+ PA++++ غني بمستخلص الأرز 30% والبروبيوتيك المخمرة. يحمي بفعالية من الأشعة مع تغذية وتهدئة وتقوية حاجز البشرة.",
        "Protection solaire SPF50+ PA++++": "حماية شمس SPF50+ PA++++",
        "Hydratation intense et nutrition": "ترطيب وتغذية مكثفة",
        "Finition légère sans effet blanc": "لمسة خفيفة دون أثر أبيض",
        "Convient à tous les types de peau": "مناسب لكل أنواع البشرة",
        "Relief Sun est une protection solaire organique légère et crémeuse qui offre une hydratation profonde sans effet gras. Sa texture ressemble à une crème hydratante légère et confortable.": "Relief Sun واقي شمس عضوي خفيف وكريمي يمنح ترطيبا عميقا دون إحساس دهني، وقوامه يشبه كريما مرطبا خفيفا ومريحا.",
        "Utiliser comme dernière étape de votre routine skincare. Appliquer une quantité suffisante sur les zones exposées au soleil.": "يستخدم كآخر خطوة في روتين العناية بالبشرة. توضع كمية كافية على المناطق المعرضة للشمس.",
        "Extrait de Riz 30%, Probiotiques fermentés, Niacinamide, Thé Vert, Extraits botaniques coréens.": "مستخلص الأرز 30%، بروبيوتيك مخمرة، نياسيناميد، الشاي الأخضر، مستخلصات نباتية كورية.",
        "Une crème coréenne nourrissante et hydratante inspirée des soins traditionnels Hanbang. Elle aide à renforcer la barrière cutanée, apporter de l’éclat et maintenir une hydratation durable sans effet gras.": "كريم كوري مغذ ومرطب مستوحى من عناية الهانبانغ التقليدية، يساعد على تقوية حاجز البشرة ومنح الإشراقة والحفاظ على ترطيب دائم دون إحساس دهني.",
        "Texture riche mais légère": "قوام غني وخفيف في نفس الوقت",
        "Dynasty Cream est une crème iconique Beauty of Joseon qui hydrate profondément, nourrit la peau et améliore son éclat naturel.": "Dynasty Cream كريم أيقوني من Beauty of Joseon يرطب البشرة بعمق ويغذيها ويحسن إشراقتها الطبيعية.",
        "Appliquer une petite quantité en dernière étape de votre routine skincare matin et soir.": "توضع كمية صغيرة كآخر خطوة في روتين العناية صباحا ومساء.",
        "Eau de Son de Riz, Ginseng, Niacinamide, Squalane, Miel, Extraits Hanbang.": "ماء نخالة الأرز، الجينسنغ، نياسيناميد، سكوالان، عسل، مستخلصات هانبانغ.",
        "Un coffret skincare coréen complet SKIN1004 contenant les essentiels de la gamme Madagascar Centella en format voyage pour nettoyer, apaiser, hydrater et protéger la peau.": "مجموعة عناية كورية كاملة من SKIN1004 تضم أساسيات Madagascar Centella بحجم السفر لتنظيف البشرة وتهدئتها وترطيبها وحمايتها.",
        "Routine skincare coréenne complète": "روتين عناية كوري كامل",
        "Format voyage pratique": "حجم سفر عملي",
        "Hydratation et apaisement intensifs": "ترطيب وتهدئة مكثفان",
        "Ce kit découverte SKIN1004 permet de tester une routine complète à base de Centella Asiatica de Madagascar pour nettoyer, calmer et renforcer la peau au quotidien.": "تتيح مجموعة SKIN1004 التجريبية اختبار روتين كامل قائم على سنتيلا أسياتيكا من مدغشقر لتنظيف البشرة وتهدئتها وتقويتها يوميا.",
        "Utiliser les produits dans l’ordre de la routine : huile nettoyante, nettoyant mousse, toner, ampoule, puis crème hydratante.": "تستخدم المنتجات حسب ترتيب الروتين: زيت تنظيف، منظف رغوي، تونر، أمبول، ثم كريم مرطب.",
        "Des pads exfoliants coréens enrichis en AHA et BHA pour éliminer les cellules mortes, réduire l’excès de sébum et affiner visiblement les pores tout en laissant la peau douce et lumineuse.": "بادز تقشير كورية غنية بـ AHA وBHA لإزالة الخلايا الميتة وتقليل الدهون الزائدة وتنقية المسام بوضوح مع ترك البشرة ناعمة ومشرقة.",
        "Exfolie et affine les pores": "يقشر وينقي المسام",
        "Réduit l’excès de sébum": "يقلل الدهون الزائدة",
        "Double texture pratique": "ملمس مزدوج عملي",
        "Laisse la peau plus lisse": "يترك البشرة أكثر نعومة",
        "Les Zero Pore Pad 2.0 offrent une exfoliation douce grâce aux AHA et BHA pour améliorer la texture de la peau, désobstruer les pores et révéler un teint plus net et plus uniforme.": "توفر Zero Pore Pad 2.0 تقشيرا لطيفا بفضل AHA وBHA لتحسين ملمس البشرة وتنظيف المسام والكشف عن بشرة أنقى وأكثر تجانسا.",
        "Après le nettoyage, passer délicatement le côté texturé du pad sur le visage, puis utiliser le côté lisse pour apaiser et hydrater la peau. Éviter le contour des yeux.": "بعد التنظيف، يمرر الجانب المحبب من الباد بلطف على الوجه، ثم يستخدم الجانب الناعم لتهدئة البشرة وترطيبها. تجنبي محيط العين.",
        "AHA (Acide Lactique), BHA (Acide Salicylique), Panthénol, Acide Hyaluronique, Centella Asiatica, Extraits botaniques coréens.": "AHA حمض اللاكتيك، BHA حمض الساليسيليك، بانثينول، حمض الهيالورونيك، سنتيلا أسياتيكا، مستخلصات نباتية كورية."
    });

    const placeholders = {
        "Rechercher un produit...": "ابحثي عن منتج...",
        "Rechercher un produit, une marque...": "ابحثي عن منتج أو علامة...",
        "Nom complet": "الاسم الكامل",
        "Téléphone": "الهاتف",
        "Email": "البريد الإلكتروني",
        "Adresse": "العنوان",
        "Notes de livraison": "ملاحظات التوصيل"
    };

    function readLanguage() {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved === "ar" ? "ar" : "fr";
        } catch (error) {
            return "fr";
        }
    }

    function saveLanguage(language) {
        try {
            localStorage.setItem(storageKey, language);
        } catch (error) {}
    }

    function replaceKeepingSpace(original, translated) {
        const leading = original.match(/^\s*/)[0];
        const trailing = original.match(/\s*$/)[0];
        return leading + translated + trailing;
    }

    function translatePattern(text) {
        const trimmed = text.replace(/\s+/g, " ").trim();
        let match = trimmed.match(/^(\d+) produits trouvés$/);

        if (match) {
            return match[1] + " منتج";
        }

        match = trimmed.match(/^(\d+) avis$/);

        if (match) {
            return match[1] + " تقييم";
        }

        match = trimmed.match(/^\|\s*([\dK+]+) ventes$/);

        if (match) {
            return "| " + match[1] + " عملية بيع";
        }

        match = trimmed.match(/^Total\s*:\s*(.+)$/);

        if (match) {
            return "المجموع: " + match[1];
        }

        return translations[trimmed] || null;
    }

    function translateTextValue(original, language) {
        if (language === "fr") {
            return original;
        }

        const translated = translatePattern(original);
        return translated ? replaceKeepingSpace(original, translated) : original;
    }

    function shouldSkipNode(node) {
        const parent = node.parentElement;

        if (!parent) {
            return true;
        }

        return parent.closest("script, style, noscript, svg") !== null;
    }

    function translateTextNode(node, language) {
        if (shouldSkipNode(node)) {
            return;
        }

        const current = node.nodeValue || "";

        if (!current.trim()) {
            return;
        }

        if (!originalText.has(node)) {
            originalText.set(node, current);
        }

        node.nodeValue = translateTextValue(originalText.get(node), language);
    }

    function getOriginalAttribute(element, attribute) {
        if (!originalAttributes.has(element)) {
            originalAttributes.set(element, {});
        }

        const stored = originalAttributes.get(element);

        if (!(attribute in stored)) {
            stored[attribute] = element.getAttribute(attribute) || "";
        }

        return stored[attribute];
    }

    function translateAttributes(element, language) {
        ["placeholder", "aria-label", "title", "alt"].forEach(attribute => {
            if (!element.hasAttribute(attribute)) {
                return;
            }

            const original = getOriginalAttribute(element, attribute);
            const translated = language === "ar" && placeholders[original]
                ? placeholders[original]
                : translateTextValue(original, language);

            element.setAttribute(attribute, translated);
        });
    }

    function walk(root, language) {
        if (!root) {
            return;
        }

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root, language);
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
            return;
        }

        if (root.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(root, language);
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode();

        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                translateTextNode(node, language);
            } else {
                translateAttributes(node, language);
            }

            node = walker.nextNode();
        }
    }

    function updateButtons(language) {
        document.querySelectorAll("[data-language-option]").forEach(button => {
            const isActive = button.dataset.languageOption === language;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function setLanguage(language) {
        activeLanguage = language === "ar" ? "ar" : "fr";
        saveLanguage(activeLanguage);

        document.documentElement.lang = activeLanguage;
        document.documentElement.dir = activeLanguage === "ar" ? "rtl" : "ltr";
        document.body.classList.toggle("is-arabic", activeLanguage === "ar");

        applying = true;
        walk(document.body, activeLanguage);
        updateButtons(activeLanguage);
        applying = false;

        document.dispatchEvent(new CustomEvent("languagechange", {
            detail: { language: activeLanguage }
        }));
    }

    function bindButtons() {
        document.querySelectorAll("[data-language-option]").forEach(button => {
            if (button.dataset.languageBound === "true") {
                return;
            }

            button.dataset.languageBound = "true";
            button.addEventListener("click", () => {
                setLanguage(button.dataset.languageOption);
            });
        });
    }

    function startObserver() {
        if (observer) {
            return;
        }

        observer = new MutationObserver(mutations => {
            if (applying) {
                return;
            }

            bindButtons();

            if (activeLanguage !== "ar") {
                updateButtons(activeLanguage);
                return;
            }

            applying = true;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => walk(node, activeLanguage));
            });
            updateButtons(activeLanguage);
            applying = false;
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function initLanguageSwitcher() {
        bindButtons();
        setLanguage(activeLanguage);
        startObserver();
    }

    window.BodySeoulLanguage = {
        setLanguage,
        getLanguage: () => activeLanguage,
        init: initLanguageSwitcher
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLanguageSwitcher);
    } else {
        initLanguageSwitcher();
    }
})();
