// src/seed-catalogue.js — Version corrigée sans upsert unique
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MEDICAMENTS = [
  { nomCommercial:'Amoxicilline 500mg', dci:'Amoxicilline', classeTherapeutique:'Antibiotique', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Beaufour Ipsen' },
  { nomCommercial:'Augmentin 1g', dci:'Amoxicilline/Acide clavulanique', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'1g', laboratoireFabricant:'GSK' },
  { nomCommercial:'Ciprofloxacine 500mg', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Métronidazole 500mg', dci:'Métronidazole', classeTherapeutique:'Antibiotique/Antiparasitaire', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Doxycycline 100mg', dci:'Doxycycline', classeTherapeutique:'Antibiotique', forme:'Gélule', dosage:'100mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Érythromycine 500mg', dci:'Érythromycine', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Pharmivoire' },
  { nomCommercial:'Cotrimoxazole 480mg', dci:'Sulfaméthoxazole/Triméthoprime', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'480mg', laboratoireFabricant:'Cipla' },
  { nomCommercial:'Azithromycine 500mg', dci:'Azithromycine', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Ceftriaxone 1g', dci:'Ceftriaxone', classeTherapeutique:'Antibiotique', forme:'Injectable', dosage:'1g', laboratoireFabricant:'Roche' },
  { nomCommercial:'Gentamicine 80mg', dci:'Gentamicine', classeTherapeutique:'Antibiotique', forme:'Injectable', dosage:'80mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Ampicilline 500mg', dci:'Ampicilline', classeTherapeutique:'Antibiotique', forme:'Gélule', dosage:'500mg', laboratoireFabricant:'Beaufour Ipsen' },
  { nomCommercial:'Clindamycine 300mg', dci:'Clindamycine', classeTherapeutique:'Antibiotique', forme:'Gélule', dosage:'300mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Ofloxacine 200mg', dci:'Ofloxacine', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Coartem', dci:'Artéméther/Luméfantrine', classeTherapeutique:'Antipaludéen', forme:'Comprimé', dosage:'20/120mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Quinine injectable 500mg', dci:'Quinine', classeTherapeutique:'Antipaludéen', forme:'Injectable', dosage:'500mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Chloroquine 250mg', dci:'Chloroquine', classeTherapeutique:'Antipaludéen', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Artésunate 200mg', dci:'Artésunate', classeTherapeutique:'Antipaludéen', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Dafra Pharma' },
  { nomCommercial:'Fansidar', dci:'Sulfadoxine/Pyriméthamine', classeTherapeutique:'Antipaludéen', forme:'Comprimé', dosage:'500/25mg', laboratoireFabricant:'Roche' },
  { nomCommercial:'Paracétamol 500mg', dci:'Paracétamol', classeTherapeutique:'Antalgique/Antipyrétique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Paracétamol 1g', dci:'Paracétamol', classeTherapeutique:'Antalgique/Antipyrétique', forme:'Comprimé', dosage:'1g', laboratoireFabricant:'UPSA' },
  { nomCommercial:'Ibuprofène 400mg', dci:'Ibuprofène', classeTherapeutique:'Anti-inflammatoire AINS', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Diclofénac 75mg injectable', dci:'Diclofénac', classeTherapeutique:'Anti-inflammatoire AINS', forme:'Injectable', dosage:'75mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Voltarène 50mg', dci:'Diclofénac sodique', classeTherapeutique:'Anti-inflammatoire AINS', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Kétoprofène 100mg', dci:'Kétoprofène', classeTherapeutique:'Anti-inflammatoire AINS', forme:'Gélule', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Tramadol 100mg', dci:'Tramadol', classeTherapeutique:'Antalgique opioïde', forme:'Injectable', dosage:'100mg', laboratoireFabricant:'Grünenthal' },
  { nomCommercial:'Prednisolone 5mg', dci:'Prednisolone', classeTherapeutique:'Corticoïde', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Dexaméthasone 4mg', dci:'Dexaméthasone', classeTherapeutique:'Corticoïde', forme:'Injectable', dosage:'4mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Loratadine 10mg', dci:'Loratadine', classeTherapeutique:'Antihistaminique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Schering' },
  { nomCommercial:'Cétirizine 10mg', dci:'Cétirizine', classeTherapeutique:'Antihistaminique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'UCB' },
  { nomCommercial:'Chlorphénamine 4mg', dci:'Chlorphénamine', classeTherapeutique:'Antihistaminique', forme:'Comprimé', dosage:'4mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Metformine 500mg', dci:'Metformine', classeTherapeutique:'Antidiabétique', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Metformine 1000mg', dci:'Metformine', classeTherapeutique:'Antidiabétique', forme:'Comprimé', dosage:'1000mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Glibenclamide 5mg', dci:'Glibenclamide', classeTherapeutique:'Antidiabétique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Insuline Rapide 100UI', dci:'Insuline humaine', classeTherapeutique:'Antidiabétique', forme:'Injectable', dosage:'100UI/mL', laboratoireFabricant:'Novo Nordisk' },
  { nomCommercial:'Insuline NPH 100UI', dci:'Insuline isophane', classeTherapeutique:'Antidiabétique', forme:'Injectable', dosage:'100UI/mL', laboratoireFabricant:'Novo Nordisk' },
  { nomCommercial:'Amlodipine 5mg', dci:'Amlodipine', classeTherapeutique:'Antihypertenseur', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Amlodipine 10mg', dci:'Amlodipine', classeTherapeutique:'Antihypertenseur', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Captopril 25mg', dci:'Captopril', classeTherapeutique:'Antihypertenseur IEC', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'BMS' },
  { nomCommercial:'Énalapril 10mg', dci:'Énalapril', classeTherapeutique:'Antihypertenseur IEC', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Losartan 50mg', dci:'Losartan', classeTherapeutique:'Antihypertenseur ARA2', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'MSD' },
  { nomCommercial:'Furosémide 40mg', dci:'Furosémide', classeTherapeutique:'Diurétique', forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Aténolol 50mg', dci:'Aténolol', classeTherapeutique:'Bêtabloquant', forme:'Comprimé', dosage:'50mg', laboratoireFabricant:'AstraZeneca' },
  { nomCommercial:'Méthyldopa 250mg', dci:'Méthyldopa', classeTherapeutique:'Antihypertenseur central', forme:'Comprimé', dosage:'250mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Oméprazole 20mg', dci:'Oméprazole', classeTherapeutique:'Antiulcéreux IPP', forme:'Gélule', dosage:'20mg', laboratoireFabricant:'AstraZeneca' },
  { nomCommercial:'Oméprazole injectable 40mg', dci:'Oméprazole', classeTherapeutique:'Antiulcéreux IPP', forme:'Injectable', dosage:'40mg', laboratoireFabricant:'AstraZeneca' },
  { nomCommercial:'Pantoprazole 40mg', dci:'Pantoprazole', classeTherapeutique:'Antiulcéreux IPP', forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'Nycomed' },
  { nomCommercial:'Métoclopramide 10mg', dci:'Métoclopramide', classeTherapeutique:'Antiémétique', forme:'Comprimé', dosage:'10mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Lopéramide 2mg', dci:'Lopéramide', classeTherapeutique:'Antidiarrhéique', forme:'Gélule', dosage:'2mg', laboratoireFabricant:'J&J' },
  { nomCommercial:'Spasfon 80mg', dci:'Phloroglucinol', classeTherapeutique:'Antispasmodique', forme:'Comprimé', dosage:'80mg', laboratoireFabricant:'Lafon' },
  { nomCommercial:'Vitamine C 500mg', dci:'Acide ascorbique', classeTherapeutique:'Vitamine', forme:'Comprimé effervescent', dosage:'500mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Vitamine B complexe 100mg', dci:'Vitamines B1/B6/B12', classeTherapeutique:'Vitamine', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Fer sulfate 200mg', dci:'Sulfate ferreux', classeTherapeutique:'Antianémique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Acide folique 5mg', dci:'Acide folique', classeTherapeutique:'Vitamine B9', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Zinc 20mg', dci:'Gluconate de zinc', classeTherapeutique:'Minéral', forme:'Comprimé', dosage:'20mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Albendazole 400mg', dci:'Albendazole', classeTherapeutique:'Antiparasitaire', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'GSK' },
  { nomCommercial:'Ivermectine 6mg', dci:'Ivermectine', classeTherapeutique:'Antiparasitaire', forme:'Comprimé', dosage:'6mg', laboratoireFabricant:'MSD' },
  { nomCommercial:'Praziquantel 600mg', dci:'Praziquantel', classeTherapeutique:'Antiparasitaire', forme:'Comprimé', dosage:'600mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Fluconazole 150mg', dci:'Fluconazole', classeTherapeutique:'Antifongique', forme:'Gélule', dosage:'150mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Kétoconazole 200mg', dci:'Kétoconazole', classeTherapeutique:'Antifongique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'J&J' },
  { nomCommercial:'Nystatine 500000UI', dci:'Nystatine', classeTherapeutique:'Antifongique', forme:'Comprimé', dosage:'500000UI', laboratoireFabricant:'Squibb' },
  { nomCommercial:'ARV TDF/3TC/EFV', dci:'Ténofovir/Lamivudine/Éfavirenz', classeTherapeutique:'Antirétroviral', forme:'Comprimé', dosage:'300/300/600mg', laboratoireFabricant:'Cipla' },
  { nomCommercial:'Aciclovir 200mg', dci:'Aciclovir', classeTherapeutique:'Antiviral', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'GSK' },
  { nomCommercial:'Aspirine 100mg', dci:'Acide acétylsalicylique', classeTherapeutique:'Antiagrégant plaquettaire', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Simvastatine 20mg', dci:'Simvastatine', classeTherapeutique:'Hypolipémiant', forme:'Comprimé', dosage:'20mg', laboratoireFabricant:'MSD' },
  { nomCommercial:'Atorvastatine 40mg', dci:'Atorvastatine', classeTherapeutique:'Hypolipémiant', forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Salbutamol aérosol 100mcg', dci:'Salbutamol', classeTherapeutique:'Bronchodilatateur', forme:'Aérosol', dosage:'100mcg/dose', laboratoireFabricant:'GSK' },
  { nomCommercial:'Théophylline 200mg', dci:'Théophylline', classeTherapeutique:'Bronchodilatateur', forme:'Comprimé LP', dosage:'200mg', laboratoireFabricant:'UCB' },
  { nomCommercial:'N-Acétylcystéine 200mg', dci:'N-Acétylcystéine', classeTherapeutique:'Mucolytique', forme:'Sachet', dosage:'200mg', laboratoireFabricant:'Zambon' },
  { nomCommercial:'Diazépam 5mg', dci:'Diazépam', classeTherapeutique:'Anxiolytique/Antiépileptique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'Roche' },
  { nomCommercial:'Phénobarbital 100mg', dci:'Phénobarbital', classeTherapeutique:'Antiépileptique', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Carbamazépine 200mg', dci:'Carbamazépine', classeTherapeutique:'Antiépileptique', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Halopéridol 5mg', dci:'Halopéridol', classeTherapeutique:'Antipsychotique', forme:'Comprimé', dosage:'5mg', laboratoireFabricant:'J&J' },
  { nomCommercial:'Amitriptyline 25mg', dci:'Amitriptyline', classeTherapeutique:'Antidépresseur', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'MSD' },
  { nomCommercial:'Ocytocine 5UI', dci:'Ocytocine', classeTherapeutique:'Utérotonique', forme:'Injectable', dosage:'5UI/mL', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Misoprostol 200mcg', dci:'Misoprostol', classeTherapeutique:'Utérotonique', forme:'Comprimé', dosage:'200mcg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Contraceptif oral combiné', dci:'Éthinylestradiol/Lévonorgestrel', classeTherapeutique:'Contraceptif', forme:'Comprimé', dosage:'30/150mcg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Adrénaline 1mg/mL', dci:'Adrénaline', classeTherapeutique:'Vasopresseur', forme:'Injectable', dosage:'1mg/mL', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Sérum physiologique 0.9% 500mL', dci:'NaCl', classeTherapeutique:'Soluté de remplissage', forme:'Perfusion', dosage:'0.9%', laboratoireFabricant:'Fresenius' },
  { nomCommercial:'Ringer Lactate 500mL', dci:'Solution de Ringer', classeTherapeutique:'Soluté de remplissage', forme:'Perfusion', dosage:'500mL', laboratoireFabricant:'Fresenius' },
  { nomCommercial:'Glucose 5% 500mL', dci:'Glucose', classeTherapeutique:'Soluté glucosé', forme:'Perfusion', dosage:'5%', laboratoireFabricant:'Fresenius' },
  { nomCommercial:'Rifampicine 150mg', dci:'Rifampicine', classeTherapeutique:'Antituberculeux', forme:'Gélule', dosage:'150mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Isoniazide 100mg', dci:'Isoniazide', classeTherapeutique:'Antituberculeux', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'RHZE 150/75/400/275mg', dci:'Rifampicine/Isoniazide/Pyrazinamide/Éthambutol', classeTherapeutique:'Antituberculeux combiné', forme:'Comprimé', dosage:'150/75/400/275mg', laboratoireFabricant:'Cipla' },
  { nomCommercial:'Paracétamol sirop 150mg/5mL', dci:'Paracétamol', classeTherapeutique:'Antalgique/Antipyrétique', forme:'Sirop', dosage:'150mg/5mL', laboratoireFabricant:'UPSA' },
  { nomCommercial:'Amoxicilline suspension 250mg/5mL', dci:'Amoxicilline', classeTherapeutique:'Antibiotique', forme:'Suspension', dosage:'250mg/5mL', laboratoireFabricant:'Beaufour' },
  { nomCommercial:'SRO sachet standard', dci:'Sels de réhydratation orale', classeTherapeutique:'Réhydratation', forme:'Poudre', dosage:'1 sachet/200mL', laboratoireFabricant:'OMS/UNICEF' },
  { nomCommercial:'Fer sirop 50mg/5mL', dci:'Sulfate ferreux', classeTherapeutique:'Antianémique', forme:'Sirop', dosage:'50mg/5mL', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Betamethasone crème 0.1%', dci:'Bétaméthasone', classeTherapeutique:'Corticoïde topique', forme:'Crème', dosage:'0.1%', laboratoireFabricant:'GSK' },
  { nomCommercial:'Clotrimazole crème 1%', dci:'Clotrimazole', classeTherapeutique:'Antifongique topique', forme:'Crème', dosage:'1%', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Timolol collyre 0.5%', dci:'Timolol', classeTherapeutique:'Antiglaucomateux', forme:'Collyre', dosage:'0.5%', laboratoireFabricant:'MSD' },
  { nomCommercial:'Ciprofloxacine collyre 0.3%', dci:'Ciprofloxacine', classeTherapeutique:'Antibiotique ophtalmique', forme:'Collyre', dosage:'0.3%', laboratoireFabricant:'Alcon' },
  { nomCommercial:'Digoxine 0.25mg', dci:'Digoxine', classeTherapeutique:'Cardiotonique', forme:'Comprimé', dosage:'0.25mg', laboratoireFabricant:'GSK' },
  { nomCommercial:'Hydrochlorothiazide 25mg', dci:'Hydrochlorothiazide', classeTherapeutique:'Diurétique', forme:'Comprimé', dosage:'25mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Glicazide 80mg', dci:'Glicazide', classeTherapeutique:'Antidiabétique', forme:'Comprimé', dosage:'80mg', laboratoireFabricant:'Servier' },
  { nomCommercial:'Maalox suspension', dci:'Aluminium/Magnésium hydroxyde', classeTherapeutique:'Antiacide', forme:'Suspension', dosage:'4%/3.5%', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Tinidazole 500mg', dci:'Tinidazole', classeTherapeutique:'Antiparasitaire', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Pfizer' },
  { nomCommercial:'Mébendazole 500mg', dci:'Mébendazole', classeTherapeutique:'Antiparasitaire', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'J&J' },
  { nomCommercial:'Norfloxacine 400mg', dci:'Norfloxacine', classeTherapeutique:'Antibiotique', forme:'Comprimé', dosage:'400mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Nitrofurantoïne 100mg', dci:'Nitrofurantoïne', classeTherapeutique:'Antibiotique urinaire', forme:'Gélule', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Propranolol 40mg', dci:'Propranolol', classeTherapeutique:'Bêtabloquant', forme:'Comprimé', dosage:'40mg', laboratoireFabricant:'AstraZeneca' },
  { nomCommercial:'Chlorpromazine 100mg', dci:'Chlorpromazine', classeTherapeutique:'Antipsychotique', forme:'Comprimé', dosage:'100mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Vitamine D3 800UI', dci:'Cholécalciférol', classeTherapeutique:'Vitamine', forme:'Comprimé', dosage:'800UI', laboratoireFabricant:'Merck' },
  { nomCommercial:'Calcium 500mg', dci:'Carbonate de calcium', classeTherapeutique:'Minéral', forme:'Comprimé', dosage:'500mg', laboratoireFabricant:'Bayer' },
  { nomCommercial:'Atropine 1mg injectable', dci:'Atropine', classeTherapeutique:'Anticholinergique', forme:'Injectable', dosage:'1mg', laboratoireFabricant:'Aguettant' },
  { nomCommercial:'Ergométrine 0.5mg', dci:'Ergométrine', classeTherapeutique:'Utérotonique', forme:'Injectable', dosage:'0.5mg', laboratoireFabricant:'Novartis' },
  { nomCommercial:'Pyramax', dci:'Pyronaridine/Artésunate', classeTherapeutique:'Antipaludéen', forme:'Comprimé', dosage:'180/60mg', laboratoireFabricant:'Shin Poong' },
  { nomCommercial:'Codéine sirop 15mg/5mL', dci:'Codéine phosphate', classeTherapeutique:'Antitussif', forme:'Sirop', dosage:'15mg/5mL', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Ferritine injectable', dci:'Fer saccharose', classeTherapeutique:'Antianémique', forme:'Injectable', dosage:'100mg/5mL', laboratoireFabricant:'Vifor' },
  { nomCommercial:'Dexaméthasone 8mg', dci:'Dexaméthasone', classeTherapeutique:'Corticoïde', forme:'Injectable', dosage:'8mg', laboratoireFabricant:'Merck' },
  { nomCommercial:'Colchicine 1mg', dci:'Colchicine', classeTherapeutique:'Antigoutte', forme:'Comprimé', dosage:'1mg', laboratoireFabricant:'Mayoly' },
  { nomCommercial:'Allopurinol 300mg', dci:'Allopurinol', classeTherapeutique:'Hypo-uricémiant', forme:'Comprimé', dosage:'300mg', laboratoireFabricant:'GSK' },
  { nomCommercial:'Zidovudine 300mg', dci:'Zidovudine', classeTherapeutique:'Antirétroviral', forme:'Comprimé', dosage:'300mg', laboratoireFabricant:'GSK' },
  { nomCommercial:'Névirapine 200mg', dci:'Névirapine', classeTherapeutique:'Antirétroviral', forme:'Comprimé', dosage:'200mg', laboratoireFabricant:'Boehringer' },
  { nomCommercial:'Artésunate injectable 60mg', dci:'Artésunate', classeTherapeutique:'Antipaludéen', forme:'Injectable', dosage:'60mg', laboratoireFabricant:'Guilin' },
  { nomCommercial:'Zinc sirop 10mg/5mL', dci:'Gluconate de zinc', classeTherapeutique:'Minéral', forme:'Sirop', dosage:'10mg/5mL', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Cotrimoxazole suspension 240mg/5mL', dci:'Sulfaméthoxazole/Triméthoprime', classeTherapeutique:'Antibiotique', forme:'Suspension', dosage:'240mg/5mL', laboratoireFabricant:'Cipla' },
  { nomCommercial:'Béclométhasone 250mcg', dci:'Béclométhasone', classeTherapeutique:'Corticoïde inhalé', forme:'Aérosol', dosage:'250mcg/dose', laboratoireFabricant:'GSK' },
  { nomCommercial:'Métoclopramide injectable 10mg', dci:'Métoclopramide', classeTherapeutique:'Antiémétique', forme:'Injectable', dosage:'10mg', laboratoireFabricant:'Sanofi' },
  { nomCommercial:'Glucose 50% 50mL', dci:'Glucose hypertonique', classeTherapeutique:'Soluté glucosé', forme:'Injectable', dosage:'50%', laboratoireFabricant:'Fresenius' },
];

const EXAMENS = [
  { nom:'Numération Formule Sanguine (NFS)', codeAzamed:'HEMA-001', categorie:'Hématologie', description:'Analyse complète des cellules sanguines' },
  { nom:'Groupe sanguin ABO et Rhésus', codeAzamed:'HEMA-002', categorie:'Hématologie', description:'Détermination du groupe sanguin' },
  { nom:'Taux d\'hémoglobine', codeAzamed:'HEMA-003', categorie:'Hématologie', description:'Mesure du taux d\'hémoglobine' },
  { nom:'TP/INR', codeAzamed:'HEMA-004', categorie:'Hématologie', description:'Temps de prothrombine / INR' },
  { nom:'TCA', codeAzamed:'HEMA-005', categorie:'Hématologie', description:'Temps de céphaline activée' },
  { nom:'VS (Vitesse de sédimentation)', codeAzamed:'HEMA-006', categorie:'Hématologie', description:'Marqueur d\'inflammation' },
  { nom:'Frottis sanguin', codeAzamed:'HEMA-007', categorie:'Hématologie', description:'Examen microscopique des cellules sanguines' },
  { nom:'Plaquettes', codeAzamed:'HEMA-008', categorie:'Hématologie', description:'Numération plaquettaire' },
  { nom:'Glycémie à jeun', codeAzamed:'BIOC-001', categorie:'Biochimie', description:'Taux de glucose sanguin à jeun' },
  { nom:'HbA1c (Hémoglobine glyquée)', codeAzamed:'BIOC-002', categorie:'Biochimie', description:'Contrôle du diabète sur 3 mois' },
  { nom:'Créatinine sérique', codeAzamed:'BIOC-003', categorie:'Biochimie', description:'Évaluation de la fonction rénale' },
  { nom:'Urée sanguine', codeAzamed:'BIOC-004', categorie:'Biochimie', description:'Évaluation de la fonction rénale' },
  { nom:'Acide urique', codeAzamed:'BIOC-005', categorie:'Biochimie', description:'Dosage de l\'acide urique' },
  { nom:'ALAT/SGPT', codeAzamed:'BIOC-006', categorie:'Biochimie', description:'Enzyme hépatique' },
  { nom:'ASAT/SGOT', codeAzamed:'BIOC-007', categorie:'Biochimie', description:'Enzyme hépatique' },
  { nom:'Bilirubine totale et directe', codeAzamed:'BIOC-008', categorie:'Biochimie', description:'Évaluation de la fonction hépatique' },
  { nom:'Phosphatases alcalines', codeAzamed:'BIOC-009', categorie:'Biochimie', description:'Enzyme hépatique/osseuse' },
  { nom:'Gamma GT', codeAzamed:'BIOC-010', categorie:'Biochimie', description:'Enzyme hépatique' },
  { nom:'Cholestérol total', codeAzamed:'BIOC-011', categorie:'Biochimie', description:'Bilan lipidique' },
  { nom:'HDL cholestérol', codeAzamed:'BIOC-012', categorie:'Biochimie', description:'Bon cholestérol' },
  { nom:'LDL cholestérol', codeAzamed:'BIOC-013', categorie:'Biochimie', description:'Mauvais cholestérol' },
  { nom:'Triglycérides', codeAzamed:'BIOC-014', categorie:'Biochimie', description:'Bilan lipidique' },
  { nom:'Ionogramme sanguin (Na, K, Cl)', codeAzamed:'BIOC-015', categorie:'Biochimie', description:'Électrolytes sanguins' },
  { nom:'Calcémie', codeAzamed:'BIOC-016', categorie:'Biochimie', description:'Taux de calcium sanguin' },
  { nom:'CRP (Protéine C réactive)', codeAzamed:'BIOC-017', categorie:'Biochimie', description:'Marqueur d\'inflammation' },
  { nom:'PSA (Antigène prostatique spécifique)', codeAzamed:'BIOC-018', categorie:'Biochimie', description:'Dépistage cancer de la prostate' },
  { nom:'AFP (Alpha-fœtoprotéine)', codeAzamed:'BIOC-019', categorie:'Biochimie', description:'Marqueur tumoral hépatique' },
  { nom:'CA 125', codeAzamed:'BIOC-020', categorie:'Biochimie', description:'Marqueur tumoral ovarien' },
  { nom:'Troponine', codeAzamed:'BIOC-021', categorie:'Biochimie', description:'Marqueur de lésion cardiaque' },
  { nom:'Amylase', codeAzamed:'BIOC-022', categorie:'Biochimie', description:'Enzyme pancréatique' },
  { nom:'Lipase', codeAzamed:'BIOC-023', categorie:'Biochimie', description:'Enzyme pancréatique' },
  { nom:'Ferritine', codeAzamed:'BIOC-024', categorie:'Biochimie', description:'Réserves en fer' },
  { nom:'Protéines totales', codeAzamed:'BIOC-025', categorie:'Biochimie', description:'Dosage des protéines sériques' },
  { nom:'Albumine sérique', codeAzamed:'BIOC-026', categorie:'Biochimie', description:'Dosage de l\'albumine' },
  { nom:'Test VIH (ELISA)', codeAzamed:'SERO-001', categorie:'Sérologie', description:'Dépistage du VIH/SIDA' },
  { nom:'Charge virale VIH', codeAzamed:'SERO-002', categorie:'Sérologie', description:'Quantification du virus VIH' },
  { nom:'CD4', codeAzamed:'SERO-003', categorie:'Sérologie', description:'Numération des lymphocytes CD4' },
  { nom:'Ag HBs (Hépatite B)', codeAzamed:'SERO-004', categorie:'Sérologie', description:'Dépistage hépatite B' },
  { nom:'Charge virale hépatite B', codeAzamed:'SERO-005', categorie:'Sérologie', description:'Quantification virus hépatite B' },
  { nom:'Ac Anti-VHC (Hépatite C)', codeAzamed:'SERO-006', categorie:'Sérologie', description:'Dépistage hépatite C' },
  { nom:'TPHA/VDRL (Syphilis)', codeAzamed:'SERO-007', categorie:'Sérologie', description:'Dépistage de la syphilis' },
  { nom:'Toxoplasmose IgG/IgM', codeAzamed:'SERO-008', categorie:'Sérologie', description:'Sérologie toxoplasmose' },
  { nom:'Rubéole IgG/IgM', codeAzamed:'SERO-009', categorie:'Sérologie', description:'Sérologie rubéole' },
  { nom:'Widal (Fièvre typhoïde)', codeAzamed:'SERO-010', categorie:'Sérologie', description:'Test de Widal pour typhoïde' },
  { nom:'Test de grossesse (Beta HCG)', codeAzamed:'SERO-011', categorie:'Sérologie', description:'Dosage de la HCG' },
  { nom:'Facteur rhumatoïde (FR)', codeAzamed:'SERO-012', categorie:'Sérologie', description:'Polyarthrite rhumatoïde' },
  { nom:'Brucella (Wright)', codeAzamed:'SERO-013', categorie:'Sérologie', description:'Dépistage brucellose' },
  { nom:'Goutte épaisse / TDR Paludisme', codeAzamed:'PARA-001', categorie:'Parasitologie', description:'Dépistage du paludisme' },
  { nom:'Examen parasitologique des selles (EPS)', codeAzamed:'PARA-002', categorie:'Parasitologie', description:'Recherche de parasites intestinaux' },
  { nom:'Scotch test anal (oxyures)', codeAzamed:'PARA-003', categorie:'Parasitologie', description:'Recherche d\'oxyures' },
  { nom:'ECBU (Examen cyto-bactériologique des urines)', codeAzamed:'BACT-001', categorie:'Bactériologie', description:'Analyse urinaire complète' },
  { nom:'Hémoculture', codeAzamed:'BACT-002', categorie:'Bactériologie', description:'Culture du sang pour bactéries' },
  { nom:'Antibiogramme', codeAzamed:'BACT-003', categorie:'Bactériologie', description:'Sensibilité aux antibiotiques' },
  { nom:'BK crachats (Bacille de Koch)', codeAzamed:'BACT-004', categorie:'Bactériologie', description:'Recherche tuberculose' },
  { nom:'Prélèvement vaginal/urétral', codeAzamed:'BACT-005', categorie:'Bactériologie', description:'Analyse des secrétions génitales' },
  { nom:'Bandelette urinaire', codeAzamed:'URO-001', categorie:'Urologie', description:'Analyse rapide des urines' },
  { nom:'Protéinurie de 24h', codeAzamed:'URO-002', categorie:'Urologie', description:'Dosage des protéines dans les urines sur 24h' },
  { nom:'Microalbuminurie', codeAzamed:'URO-003', categorie:'Urologie', description:'Petites quantités d\'albumine dans les urines' },
  { nom:'TSH (Thyréostimuline)', codeAzamed:'HORM-001', categorie:'Hormonologie', description:'Fonction thyroïdienne' },
  { nom:'T3 libre', codeAzamed:'HORM-002', categorie:'Hormonologie', description:'Hormone thyroïdienne T3' },
  { nom:'T4 libre', codeAzamed:'HORM-003', categorie:'Hormonologie', description:'Hormone thyroïdienne T4' },
  { nom:'Cortisol', codeAzamed:'HORM-004', categorie:'Hormonologie', description:'Hormone surrénalienne' },
  { nom:'FSH/LH', codeAzamed:'HORM-005', categorie:'Hormonologie', description:'Hormones de la fertilité' },
  { nom:'Œstradiol', codeAzamed:'HORM-006', categorie:'Hormonologie', description:'Hormone féminine' },
  { nom:'Progestérone', codeAzamed:'HORM-007', categorie:'Hormonologie', description:'Hormone de la grossesse' },
  { nom:'Testostérone', codeAzamed:'HORM-008', categorie:'Hormonologie', description:'Hormone masculine' },
  { nom:'Prolactine', codeAzamed:'HORM-009', categorie:'Hormonologie', description:'Hormone de la lactation' },
  { nom:'Beta HCG quantitatif', codeAzamed:'HORM-010', categorie:'Hormonologie', description:'Suivi de grossesse' },
  { nom:'Radiographie thoracique', codeAzamed:'IMG-001', categorie:'Imagerie', description:'Radiographie du thorax' },
  { nom:'Radiographie abdomen (ASP)', codeAzamed:'IMG-002', categorie:'Imagerie', description:'Radiographie de l\'abdomen' },
  { nom:'Radiographie osseuse', codeAzamed:'IMG-003', categorie:'Imagerie', description:'Radiographie des os et articulations' },
  { nom:'Échographie abdominale', codeAzamed:'IMG-004', categorie:'Imagerie', description:'Échographie de l\'abdomen' },
  { nom:'Échographie pelvienne', codeAzamed:'IMG-005', categorie:'Imagerie', description:'Échographie du pelvis' },
  { nom:'Échographie obstétricale', codeAzamed:'IMG-006', categorie:'Imagerie', description:'Échographie de grossesse' },
  { nom:'Échographie cardiaque', codeAzamed:'IMG-007', categorie:'Imagerie', description:'Échocardiographie' },
  { nom:'Mammographie', codeAzamed:'IMG-008', categorie:'Imagerie', description:'Radiographie des seins' },
  { nom:'Scanner (TDM) cérébral', codeAzamed:'IMG-009', categorie:'Imagerie', description:'Tomodensitométrie du cerveau' },
  { nom:'Scanner thoracique', codeAzamed:'IMG-010', categorie:'Imagerie', description:'Tomodensitométrie du thorax' },
  { nom:'Scanner abdominal', codeAzamed:'IMG-011', categorie:'Imagerie', description:'Tomodensitométrie de l\'abdomen' },
  { nom:'IRM cérébrale', codeAzamed:'IMG-012', categorie:'Imagerie', description:'IRM du cerveau' },
  { nom:'IRM rachidienne', codeAzamed:'IMG-013', categorie:'Imagerie', description:'IRM de la colonne vertébrale' },
  { nom:'Panoramique dentaire', codeAzamed:'IMG-014', categorie:'Imagerie', description:'Radiographie dentaire panoramique' },
  { nom:'Frottis cervico-vaginal (FCV)', codeAzamed:'ANAT-001', categorie:'Anatomopathologie', description:'Dépistage cancer du col utérin' },
  { nom:'Biopsie hépatique', codeAzamed:'ANAT-002', categorie:'Anatomopathologie', description:'Prélèvement et analyse du foie' },
  { nom:'Biopsie ganglionnaire', codeAzamed:'ANAT-003', categorie:'Anatomopathologie', description:'Analyse d\'un ganglion lymphatique' },
  { nom:'Biopsie cutanée', codeAzamed:'ANAT-004', categorie:'Anatomopathologie', description:'Analyse d\'un fragment de peau' },
  { nom:'Biopsie prostatique', codeAzamed:'ANAT-005', categorie:'Anatomopathologie', description:'Prélèvement de tissu prostatique' },
];

const SERVICES = [
  { nom:'Consultation médecine générale', categorie:'Médecine générale', description:'Consultation médicale généraliste' },
  { nom:'Consultation d\'urgence', categorie:'Médecine générale', description:'Prise en charge des urgences médicales' },
  { nom:'Visite à domicile', categorie:'Médecine générale', description:'Consultation médicale à domicile' },
  { nom:'Vaccination adulte et enfant', categorie:'Médecine générale', description:'Programme de vaccination' },
  { nom:'Planification familiale', categorie:'Médecine générale', description:'Contraception et conseil familial' },
  { nom:'Certificat médical', categorie:'Médecine générale', description:'Délivrance de certificats médicaux' },
  { nom:'Cardiologie', categorie:'Spécialité médicale', description:'Maladies du cœur et des vaisseaux' },
  { nom:'Pneumologie', categorie:'Spécialité médicale', description:'Maladies respiratoires' },
  { nom:'Neurologie', categorie:'Spécialité médicale', description:'Maladies du système nerveux' },
  { nom:'Gastro-entérologie', categorie:'Spécialité médicale', description:'Maladies digestives' },
  { nom:'Endocrinologie / Diabétologie', categorie:'Spécialité médicale', description:'Diabète, thyroïde, hormones' },
  { nom:'Néphrologie', categorie:'Spécialité médicale', description:'Maladies rénales' },
  { nom:'Rhumatologie', categorie:'Spécialité médicale', description:'Maladies articulaires et osseuses' },
  { nom:'Hématologie', categorie:'Spécialité médicale', description:'Maladies du sang' },
  { nom:'Infectiologie / VIH', categorie:'Spécialité médicale', description:'Maladies infectieuses et VIH' },
  { nom:'Oncologie médicale', categorie:'Spécialité médicale', description:'Cancer et chimiothérapie' },
  { nom:'Dermatologie', categorie:'Spécialité médicale', description:'Maladies de la peau' },
  { nom:'Ophtalmologie', categorie:'Spécialité médicale', description:'Maladies des yeux' },
  { nom:'ORL (Oto-rhino-laryngologie)', categorie:'Spécialité médicale', description:'Oreilles, nez, gorge' },
  { nom:'Stomatologie / Dentisterie', categorie:'Spécialité médicale', description:'Soins dentaires' },
  { nom:'Psychiatrie', categorie:'Spécialité médicale', description:'Santé mentale' },
  { nom:'Médecine interne', categorie:'Spécialité médicale', description:'Pathologies complexes multisystémiques' },
  { nom:'Chirurgie générale', categorie:'Spécialité chirurgicale', description:'Chirurgie de l\'abdomen et organes' },
  { nom:'Chirurgie orthopédique / Traumatologie', categorie:'Spécialité chirurgicale', description:'Os, articulations, fractures' },
  { nom:'Neurochirurgie', categorie:'Spécialité chirurgicale', description:'Chirurgie du cerveau et de la colonne' },
  { nom:'Chirurgie urologique', categorie:'Spécialité chirurgicale', description:'Chirurgie des voies urinaires' },
  { nom:'Chirurgie plastique / reconstructrice', categorie:'Spécialité chirurgicale', description:'Chirurgie esthétique et reconstructrice' },
  { nom:'Chirurgie pédiatrique', categorie:'Spécialité chirurgicale', description:'Chirurgie de l\'enfant' },
  { nom:'Chirurgie maxillo-faciale', categorie:'Spécialité chirurgicale', description:'Chirurgie buccale et faciale' },
  { nom:'Consultation gynécologique', categorie:'Gynécologie-Obstétrique', description:'Suivi gynécologique de la femme' },
  { nom:'Suivi de grossesse (CPN)', categorie:'Gynécologie-Obstétrique', description:'Consultations prénatales' },
  { nom:'Accouchement normal', categorie:'Gynécologie-Obstétrique', description:'Accouchement par voie basse' },
  { nom:'Accouchement par césarienne', categorie:'Gynécologie-Obstétrique', description:'Accouchement chirurgical' },
  { nom:'Soins post-partum (CPON)', categorie:'Gynécologie-Obstétrique', description:'Soins après accouchement' },
  { nom:'Colposcopie', categorie:'Gynécologie-Obstétrique', description:'Examen du col de l\'utérus' },
  { nom:'Consultation pédiatrique', categorie:'Pédiatrie', description:'Soins médicaux de l\'enfant' },
  { nom:'Suivi de croissance', categorie:'Pédiatrie', description:'Surveillance de la croissance de l\'enfant' },
  { nom:'Vaccination enfant (PEV)', categorie:'Pédiatrie', description:'Programme élargi de vaccination' },
  { nom:'Néonatologie', categorie:'Pédiatrie', description:'Soins du nouveau-né' },
  { nom:'Urgences pédiatriques', categorie:'Pédiatrie', description:'Prise en charge urgences chez l\'enfant' },
  { nom:'Réanimation médicale', categorie:'Plateau technique', description:'Réanimation médicale et chirurgicale' },
  { nom:'Soins intensifs (ICU)', categorie:'Plateau technique', description:'Unité de soins intensifs' },
  { nom:'Bloc opératoire', categorie:'Plateau technique', description:'Salle d\'opération chirurgicale' },
  { nom:'Anesthésie générale', categorie:'Plateau technique', description:'Anesthésie pour chirurgie' },
  { nom:'Hémodialyse', categorie:'Plateau technique', description:'Rein artificiel pour insuffisance rénale' },
  { nom:'Oxygénothérapie', categorie:'Plateau technique', description:'Administration d\'oxygène médical' },
  { nom:'Transfusion sanguine', categorie:'Plateau technique', description:'Transfusion de produits sanguins' },
  { nom:'Électrocardiogramme (ECG)', categorie:'Plateau technique', description:'Enregistrement activité électrique cardiaque' },
  { nom:'Fibroscopie gastrique (FOGD)', categorie:'Plateau technique', description:'Endoscopie digestive haute' },
  { nom:'Coloscopie', categorie:'Plateau technique', description:'Exploration du côlon' },
  { nom:'Spirométrie / EFR', categorie:'Plateau technique', description:'Exploration fonctionnelle respiratoire' },
  { nom:'Hospitalisation médecine', categorie:'Hospitalisation', description:'Hospitalisation en service de médecine' },
  { nom:'Hospitalisation chirurgie', categorie:'Hospitalisation', description:'Hospitalisation en service de chirurgie' },
  { nom:'Hospitalisation maternité', categorie:'Hospitalisation', description:'Hospitalisation en maternité' },
  { nom:'Hospitalisation pédiatrie', categorie:'Hospitalisation', description:'Hospitalisation d\'enfants' },
  { nom:'Programme VIH/SIDA (PTME)', categorie:'Programmes Cameroun', description:'Prévention transmission mère-enfant du VIH' },
  { nom:'Programme tuberculose (PNT)', categorie:'Programmes Cameroun', description:'Prise en charge de la tuberculose' },
  { nom:'Programme paludisme', categorie:'Programmes Cameroun', description:'Prévention et traitement du paludisme' },
  { nom:'Dépistage cancers', categorie:'Programmes Cameroun', description:'Initiative de prévention des cancers' },
  { nom:'Nutrition thérapeutique', categorie:'Programmes Cameroun', description:'Prise en charge malnutrition sévère' },
  { nom:'Bilan de santé complet', categorie:'Prévention', description:'Bilan médical annuel complet' },
  { nom:'Dépistage diabète', categorie:'Prévention', description:'Dépistage précoce du diabète' },
  { nom:'Dépistage hypertension', categorie:'Prévention', description:'Mesure et suivi de la tension artérielle' },
  { nom:'Dépistage cancer du sein', categorie:'Prévention', description:'Mammographie et auto-examen' },
  { nom:'Dépistage cancer du col (FCV)', categorie:'Prévention', description:'Frottis cervico-vaginal de dépistage' },
  { nom:'Dépistage MST/IST', categorie:'Prévention', description:'Infections sexuellement transmissibles' },
  { nom:'Médecine physique / Rééducation', categorie:'Spécialité médicale', description:'Rééducation fonctionnelle et kinésithérapie' },
  { nom:'Psychologie clinique', categorie:'Spécialité médicale', description:'Suivi psychologique et thérapies' },
  { nom:'Médecine du travail', categorie:'Médecine générale', description:'Santé en milieu professionnel' },
  { nom:'Chirurgie cardiovasculaire', categorie:'Spécialité chirurgicale', description:'Chirurgie du cœur et des vaisseaux' },
  { nom:'Urologie', categorie:'Spécialité médicale', description:'Maladies des voies urinaires et de la prostate' },
  { nom:'Chirurgie ORL', categorie:'Spécialité chirurgicale', description:'Chirurgie ORL' },
];

async function main() {
  console.log('🌱 Seeding catalogue AZAMED Cameroun...\n');

  // ── Médicaments ───────────────────────────────────────────────
  console.log(`📦 Ajout de ${MEDICAMENTS.length} médicaments...`);
  let medOk = 0, medSkip = 0;
  for (const med of MEDICAMENTS) {
    try {
      // Vérifier si déjà présent
      const existing = await prisma.medicament.findFirst({
        where: { nomCommercial: med.nomCommercial }
      });
      if (existing) { medSkip++; continue; }
      await prisma.medicament.create({
        data: {
          nomCommercial:       med.nomCommercial,
          dci:                 med.dci,
          classeTherapeutique: med.classeTherapeutique || 'Autre',
          forme:               med.forme || 'Comprimé',
          dosage:              med.dosage || '',
          laboratoireFabricant:med.laboratoireFabricant || '',
          isActive:            true,
        }
      });
      medOk++;
    } catch (e) {
      medSkip++;
    }
  }
  console.log(`  ✅ ${medOk} médicaments ajoutés, ${medSkip} ignorés\n`);

  // ── Examens ───────────────────────────────────────────────────
  console.log(`🔬 Ajout de ${EXAMENS.length} examens...`);
  let exOk = 0, exSkip = 0;
  for (const ex of EXAMENS) {
    try {
      const existing = await prisma.examen.findFirst({
        where: { codeAzamed: ex.codeAzamed }
      });
      if (existing) { exSkip++; continue; }
      await prisma.examen.create({
        data: {
          nom:        ex.nom,
          codeAzamed: ex.codeAzamed,
          categorie:  ex.categorie,
          description:ex.description,
          isActive:   true,
        }
      });
      exOk++;
    } catch (e) {
      exSkip++;
    }
  }
  console.log(`  ✅ ${exOk} examens ajoutés, ${exSkip} ignorés\n`);

  // ── Services ──────────────────────────────────────────────────
  console.log(`🏥 Ajout de ${SERVICES.length} services...`);
  let svOk = 0, svSkip = 0;
  for (const sv of SERVICES) {
    try {
      const existing = await prisma.serviceMedical.findFirst({
        where: { nom: sv.nom }
      });
      if (existing) { svSkip++; continue; }
      await prisma.serviceMedical.create({
        data: {
          nom:        sv.nom,
          categorie:  sv.categorie,
          description:sv.description,
          isActive:   true,
        }
      });
      svOk++;
    } catch (e) {
      svSkip++;
    }
  }
  console.log(`  ✅ ${svOk} services ajoutés, ${svSkip} ignorés\n`);

  console.log('🎉 Catalogue AZAMED Cameroun chargé avec succès !');
  console.log(`   📊 Total : ${medOk} médicaments | ${exOk} examens | ${svOk} services`);
}

main()
  .catch((e) => { console.error('❌ Erreur:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
