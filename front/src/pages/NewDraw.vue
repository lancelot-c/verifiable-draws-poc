<template>
    <q-page class="row justify-evenly">

        <div class="column page-content q-mx-xl">

            <h4 class="text-center">Create a verifiable draw</h4>

            <!-- <q-separator inset class="q-my-lg" /> -->

            <q-stepper v-model="step" ref="stepper" color="primary" header-nav animated flat>


                <q-step :name="1" title="Draw title and rules" icon="settings" :done="step > 1" :header-nav="step > 1 && step != 4">
                    <q-input outlined v-model="title" class="q-my-lg" label="Title" placeholder="2026 FIFA World Cup Draw"
                        :rules="[val => !!val || 'Field is required']" />

                    <q-input v-model="rules" outlined class="q-my-lg" type="textarea" label="Rules"
                        placeholder="All participating nations will be drawn to make an ordered list.
    The first 3 nations from the list will form the group A, the following 3 nations will form the group B, etc... until no nation remain." :rules="[val => !!val || 'Field is required']" />

                    <q-stepper-navigation>
                        <q-btn @click="() => { done1 = true; step = 2; }" color="primary" label="Continue" />
                    </q-stepper-navigation>
                </q-step>


                <q-step :name="2" title="Participants" icon="group" :done="step > 2" :header-nav="step > 2 && step != 4">
                    How do you want to retrieve the list of participants ?
                    <div class="q-gutter-sm q-my-lg">
                        <q-option-group :options="options" type="radio" v-model="participantsRetrieval" />
                    </div>

                    <q-input v-model="participants" outlined class="q-my-lg" type="textarea" label="List of participants"
                        :placeholder="participantsPlaceholder" :rules="[val => !!val || 'Field is required']" />

                    <q-input v-model="nbWinners" type="number" outlined class="q-my-lg"
                        label="Number of participants to draw" placeholder="48" style="max-width: 300px" />

                    <q-stepper-navigation>
                        <q-btn @click="() => { done2 = true; step = 3; }" color="primary" label="Continue" />
                        <q-btn flat @click="step = 1" color="primary" label="Back" class="q-ml-sm" />
                    </q-stepper-navigation>
                </q-step>


                <q-step :name="3" title="Scheduled date and time" icon="event" :done="step > 3" :header-nav="step > 3 && step != 4">
                    <p class="text-center q-my-lg">
                        The draw must be scheduled at least 5 minutes from the current date and time. We enforce this constraint in order to let you have the time to share the draw link with the participants before the draw is triggered.
                    </p>

                    <div class="row justify-evenly">
                        <q-date v-model="scheduledAtDate" :options="dateOptionsFn" now-btn class="q-my-lg" />
                        <q-time v-model="scheduledAtTime" :options="timeOptionsFn" class="q-my-lg" />
                    </div>

                    <q-stepper-navigation>
                        <q-btn @click="() => { done3 = true; step = 4; }" color="primary" label="Continue" />
                        <q-btn flat @click="step = 2" color="primary" label="Back" class="q-ml-sm" />
                    </q-stepper-navigation>
                </q-step>


                <q-step :name="4" title="Share the draw" icon="sms" :done="step > 4" :header-nav="step > 4">
                    <p class="text-center q-my-lg">
                        Your draw was successfully deployed on IPFS and Ethereum !<br />
                        Now copy and share the following link on your main communication platform:
                    </p>
                    <div class="ipfs-card row justify-center items-center">
                        <p class="ipfs-card__cid q-mb-none q-mr-lg">{{ ipfsLink }}</p>
                        <!-- <q-icon name="content_copy" /> -->
                        <q-btn round unelevated icon="content_copy" @click="copyIPFSLinkToClipboard()" />
                    </div>
                    <p class="text-center q-my-lg">
                        In order for the draw to be valid you MUST share this link before <span class="text-underline">{{ scheduledAtDate }} {{ scheduledAtTime }}</span>.
                    </p>
                    <p class="text-center q-my-lg">
                        You can alternatively share this QR code which is the strict equivalent of the above link:
                    </p>
                    <div class="row justify-center items-center">
                        <q-img
                            src="./../assets/qr-code.png"
                            style="width: 300px"
                            />
                        <!-- <q-btn round unelevated icon="content_copy" @click="copyIPFSLinkToClipboard()" /> -->
                    </div>
                    
                    <q-stepper-navigation>
                        <q-btn color="primary" @click="done4 = true" label="Finish" />
                    </q-stepper-navigation>
                </q-step>


            </q-stepper>

        </div>

    </q-page>
</template>

<script setup lang="ts">
import { date } from 'quasar';
import { ref } from 'vue';

const done1 = ref(false);
const done2 = ref(false);
const done3 = ref(false);
const done4 = ref(false);
const step = ref(3);
const title = ref('');
const rules = ref('');
const participantsRetrieval = ref('manual');
let options = [
    { label: 'Manually type the list of participants', value: 'manual' },
    { label: 'Retrieve the list of participants from social media (Youtube, Instagram, Twitter, TikTok, LinkedIn)', value: 'socialMedia', disable: true },
    { label: 'Upload the list of participants from a .csv or .txt file', value: 'file', disable: true }
];
const participants = ref('');
const participantsPlaceholder = ref(`Argentina
Brazil
England
France
Spain
Belgium
Portugal
Germany
The Netherlands
Uruguay
Croatia
Denmark
Mexico
the United States
Senegal
Wales
Poland
Australia
Japan
Morocco
Switzerland
Ghana
Korea Republic
Cameroon
Serbia
Canada
Costa Rica
Tunisia
Saudi Arabia
Iran
Ecuador`);
const nbWinners = ref();
const ipfsLink = 'ipfs://bafybeidi32pvwvfwjtzrtzuhiqqapqcdhy3xjwfrtldaxiaze34gdbuwuq';

let minimumScheduledAt = date.addToDate(Date.now(), { minutes: 0 });
const scheduledAtDate = ref(date.formatDate(minimumScheduledAt, 'YYYY/MM/DD'));
const scheduledAtTime = ref(date.formatDate(minimumScheduledAt, 'HH:mm'));

function dateOptionsFn(d: string) {
    minimumScheduledAt = date.addToDate(Date.now(), { minutes: 0 });
    const minimumDate = date.formatDate(minimumScheduledAt, 'YYYY/MM/DD');

    return d >= minimumDate;
}

function timeOptionsFn(hr: number, min: number | null) {
    minimumScheduledAt = date.addToDate(Date.now(), { minutes: 0 });
    const minimumHr = Number(date.formatDate(minimumScheduledAt, 'HH'));
    const minimumMin = Number(date.formatDate(minimumScheduledAt, 'mm'));

    return hr > minimumHr || (hr == minimumHr && min != null && min >= minimumMin);
}

function copyIPFSLinkToClipboard() {
    navigator.clipboard.writeText(ipfsLink).then(() => {
        console.log('Async: Copying to clipboard was successful!');
    }, (err) => {
        console.error('Async: Could not copy text: ', err);
    });
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
    font-size: 1.4em;
}

.text-underline {
    text-decoration: underline;
}
</style>