<template>
    <q-page class="row justify-evenly">

        <div class="column page-content q-mx-xl">

            <h4 class="text-center">Créer un tirage au sort vérifiable</h4>

            <q-stepper v-model="step" ref="stepper" color="primary" header-nav animated flat>


                <q-step :name="1" title="Nom du tirage et règles" icon="settings" :done="step > 1" :header-nav="step > 1 && step != 4 && !loading">
                    <div class="step-inner-content">
                        <q-input outlined v-model="drawTitle" class="q-my-lg" :input-style="{ fontSize: '1.3em', lineHeight: '26px' }" label="Nom du tirage" :placeholder="titlePlaceholder"
                            :rules="[val => !!val || 'Ce champ est requis']" />

                        <q-input v-model="drawRules" outlined class="q-my-lg" :input-style="{ fontSize: '1.3em', lineHeight: '26px', height: '230px' }" type="textarea" label="Règles"
                            :placeholder="rulesPlaceholder" :rules="[val => !!val || 'Ce champ est requis']" />

                        <q-stepper-navigation>
                            <div class="stepper-navigation-inner-content">
                                <q-btn @click="() => { step = 2; }" color="primary" label="Continuer" />
                            </div>
                        </q-stepper-navigation>
                    </div>
                </q-step>


                <q-step :name="2" title="Participants" icon="group" :done="step > 2" :header-nav="step > 2 && step != 4 && !loading">
                    <div class="step-inner-content">
                        <div class="step-inner-content__text">
                            Comment voulez-vous récupérer la liste des participants ?
                        
                            <div class="q-gutter-sm q-my-lg">
                                <q-option-group :options="options" type="radio" v-model="participantsRetrieval" />
                            </div>
                        </div>

                        <q-input v-model="drawParticipants" outlined class="q-my-lg" :input-style="{ fontSize: '1.3em', lineHeight: '26px' }" type="textarea" label="Liste des participants"
                            :placeholder="participantsPlaceholder" :rules="[val => !!val || 'Ce champ est requis']" />

                        <q-input v-model="drawNbWinners" type="number" outlined class="q-my-lg" :input-style="{ fontSize: '1.3em', lineHeight: '26px' }" 
                            label="Nombre de gagnants" :placeholder="nbWinnersPlaceholder" style="max-width: 300px" />

                        <q-stepper-navigation>
                            <div class="stepper-navigation-inner-content">
                                <q-btn flat @click="step = 1" color="primary" label="Précédent" class="q-ml-sm" />
                                <q-btn @click="() => { step = 3; }" color="primary" label="Continuer" />
                            </div>
                        </q-stepper-navigation>
                    </div>
                </q-step>


                <q-step :name="3" title="Date et heure de déclenchement" icon="event" :done="step > 3" :header-nav="step > 3 && step != 4 && !loading">
                    <div class="step-inner-content">
                        <div class="step-inner-content__text">
                            <p class="text-center q-my-lg">
                                Le tirage doit être programmé au moins 5 minutes dans le futur.
                                Nous imposons cette contrainte afin de vous laisser le temps de partager le lien du tirage aux participants avant que le tirage ne se déclenche.
                            </p>
                        </div>

                        <div class="row justify-evenly">
                            <q-date v-model="drawScheduledAtDate" :options="dateOptionsFn" now-btn class="q-my-lg" :locale="myLocale" />
                            <q-time v-model="drawScheduledAtTime" :options="timeOptionsFn" format24h class="q-my-lg" />
                        </div>

                        <q-stepper-navigation>
                            <div class="stepper-navigation-inner-content">
                                <q-btn flat @click="step = 2" color="primary" label="Précédent" class="q-ml-sm" :disable="loading" />
                                <q-btn @click="deployDraw" color="primary" label="Publier" :loading="loading" :disable="loading" />
                            </div>
                        </q-stepper-navigation>
                    </div>
                </q-step>


                <q-step :name="4" title="Partager le tirage" icon="sms" :done="step > 4" :header-nav="false">
                    <div class="step-inner-content">
                        <div class="step-inner-content__text">
                            <p class="text-center q-my-lg">
                                Votre tirage a été déployé avec succès sur IPFS et Ethereum 🎉<br />
                                Il ne vous reste plus qu'à partager le lien suivant aux participants :
                            </p>
                        
                            <div class="ipfs-card row justify-center items-center">
                                <p class="ipfs-card__cid q-mb-none q-mr-lg">https://{{ ipfsCid }}.ipfs.dweb.link/{{ drawFilename }}</p>
                                <!-- <q-icon name="content_copy" /> -->
                                <q-btn round unelevated icon="content_copy" @click="copyIPFSLinkToClipboard()" />
                                <q-btn round unelevated icon="open_in_new" :href="'https://' + ipfsCid + '.ipfs.dweb.link/' + drawFilename" target="_blank" />
                            </div>
                            <p class="text-center q-my-lg">
                                Pour que le tirage soit valide vous DEVEZ partager ce lien avant le <span class="text-underline">{{ drawScheduledAtDate }} à {{ drawScheduledAtTime }}</span>.
                            </p>
                            <p class="text-center q-my-lg">
                                Autrement vous pouvez partager ce QR code qui est le strict équivalent du lien ci-dessus:
                            </p>
                            <div class="row justify-center items-center">
                                <q-img
                                    src="./../assets/qr-code.png"
                                    style="width: 300px"
                                    />
                                <q-btn round unelevated icon="download" @click="downloadQrCode()" class="q-ml-lg" />
                            </div>
                        </div>
                        
                        <q-stepper-navigation>
                            <div class="stepper-navigation-inner-content">
                                <q-btn color="primary" @click="reset" label="Créer un nouveau tirage" />
                            </div>
                        </q-stepper-navigation>
                    </div>
                </q-step>


            </q-stepper>

        </div>

    </q-page>
</template>

<script setup lang="ts">
import DrawService from 'src/services/DrawService';
import { date } from 'quasar';
import { ref } from 'vue';

const step = ref(3);
const loading = ref(false);

const titlePlaceholder = 'FIFA Coupe du monde de football 2026';
const drawTitle = ref(titlePlaceholder);

const rulesPlaceholder = `48 équipes nationales ont été sélectionnées lors des qualifications pour la Coupe du monde 2026 de football. Ce tirage au sort a pour but de placer aléatoirement toutes les équipes qualifiées dans 12 groupes de 4 équipes.

Toutes les équipes seront tirés au sort l'une après l'autre.
Le résultat du tirage consistera donc en une liste ordonnée des 48 équipes.
Les 4 premières équipes de la liste formeront le groupe A, les 4 équipes suivantes formeront le groupe B, etc... jusqu'à ce que tous les groupes soient formés.`;
const drawRules = ref(rulesPlaceholder);

const participantsRetrieval = ref('manual');
let options = [
    { label: 'Écrire manuellement la liste des participants', value: 'manual' },
    { label: 'Récupérer la liste des participants sur un réseau social (Youtube, Instagram, Twitter, TikTok, LinkedIn)', value: 'socialMedia', disable: true },
    { label: 'Importer la liste des participants depuis un fichier .csv ou .txt', value: 'file', disable: true }
];

const participantsPlaceholder = `Argentine
Brésil
Angleterre
France
Espagne
Belgique
Portugal
Allemagne
Pays-Bas
Uruguay
Croatie
Danemark
Mexique
Etats-Unis
Sénégal
Pays de Galles
Pologne
Australie
Japon
Maroc
Suisse
Ghana
Corée du Sud
Cameroon
Serbie
Canada
Costa Rica
Tunisie
Arabie Saoudite
Iran
Equateur
Chine
Inde
Indonésie
Pakistan
Nigeria
Bangladesh
Russie
Éthiopie
Philippines
Égypte
Viêt Nam
République démocratique du Congo
Turquie
Thaïlande
Tanzanie
Afrique du Sud
Italie`;

const drawParticipants = ref(participantsPlaceholder);
const nbWinnersPlaceholder = '48';
const drawNbWinners = ref(nbWinnersPlaceholder);

const ipfsCid = ref('');
const drawFilename = ref('');

const myLocale = {
    /* starting with Sunday */
    days: 'Dimanche_Lundi_Mardi_Mercredi_Jeudi_Vendredi_Samedi'.split('_'),
    daysShort: 'Dim_Lun_Mar_Mer_Jeu_Ven_Sam'.split('_'),
    months: 'Janvier_Février_Mars_Avril_Mai_Juin_Juillet_Août_Septembre_Octobre_Novembre_Décembre'.split('_'),
    monthsShort: 'Jan_Fev_Mars_Avr_Mai_Juin_Juil_Août_Sept_Oct_Nov_Dec'.split('_'),
    firstDayOfWeek: 1, // 0-6, 0 - Sunday, 1 Monday, ...
    format24h: true,
    pluralDay: 'jours'
};

const safetyMinutes = 0; // Should be 5
const minimumScheduledAt = ref(date.addToDate(Date.now(), { minutes: safetyMinutes }));
const drawScheduledAtDate = ref(date.formatDate(minimumScheduledAt.value, 'YYYY/MM/DD'));
const drawScheduledAtTime = ref(date.formatDate(minimumScheduledAt.value, 'HH:mm'));

function dateOptionsFn(d: string) {
    minimumScheduledAt.value = date.addToDate(Date.now(), { minutes: safetyMinutes });
    const minimumDate = date.formatDate(minimumScheduledAt.value, 'YYYY/MM/DD');

    return d >= minimumDate;
}

function timeOptionsFn(hr: number, min: number | null) {

    minimumScheduledAt.value = date.addToDate(Date.now(), { minutes: safetyMinutes });
    const minimumDate = date.formatDate(minimumScheduledAt.value, 'YYYY/MM/DD');

    if (drawScheduledAtDate.value > minimumDate) {
        return true;
    }

    const minimumHr = Number(date.formatDate(minimumScheduledAt.value, 'HH'));
    const minimumMin = Number(date.formatDate(minimumScheduledAt.value, 'mm'));

    if (hr > minimumHr) {
        return true;
    }

    if (hr < minimumHr) {
        return false;
    }

    if (min === null) {
        return true;
    } else if (min >= 0 && min <= 59 && min >= minimumMin) {
        return true;
    }

    return false;
}

function copyIPFSLinkToClipboard() {
    navigator.clipboard.writeText(`https://${ipfsCid.value}.ipfs.dweb.link/${drawFilename.value}`).then(() => {
        console.log('Async: Copying to clipboard was successful!');
    }, (err) => {
        console.error('Async: Could not copy text: ', err);
    });
}

function downloadQrCode() {
    let link = document.createElement('a');
    link.href = 'http://localhost:9000/src/assets/qr-code.png';
    link.download = 'qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function deployDraw() {

    loading.value = true;
    const year = Number(date.formatDate(drawScheduledAtDate.value, 'YYYY'));
    const month = Number(date.formatDate(drawScheduledAtDate.value, 'MM'));
    const day = Number(date.formatDate(drawScheduledAtDate.value, 'DD'));
    const hour = Number(drawScheduledAtTime.value.split(':')[0]);
    const minute = Number(drawScheduledAtTime.value.split(':')[1]);
    const second = 0;
    const drawScheduledAt = date.buildDate({ year, month, day, hour, minute, second });
    const drawScheduledAtTimestamp = Number(date.formatDate(drawScheduledAt, 'X'));
    
    const createdDraw = await DrawService.create(drawTitle.value, drawRules.value, drawParticipants.value, drawNbWinners.value, drawScheduledAtTimestamp);

    ipfsCid.value = createdDraw.data.ipfsCidString;
    drawFilename.value = createdDraw.data.drawFilename;
    step.value = 4;
    loading.value = false;
}

function reset() {
    step.value = 1;
}
</script>

<style scoped>
.page-content {
    width: 70%;
}

.ipfs-card {
    background-color: #f3f3f3;
    border-radius: 4px;
    padding: 8px;
    font-size: .95em;
}

.text-underline {
    text-decoration: underline;
}

.step-inner-content__text {
    font-size: 1.3em;
}

.stepper-navigation-inner-content {
    text-align: end;
}
</style>