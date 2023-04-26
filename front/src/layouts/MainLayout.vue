<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>

      <q-toolbar class="bg-grey-9 text-white q-px-xl">
        <q-toolbar-title class="text-bold">
          Verifiable Draws
        </q-toolbar-title>

        <div class="search-input">
            <q-input dark dense standout v-model="search" placeholder="Rechercher un tirage">
            <template v-slot:prepend>
                <q-icon name="search" />
            </template>

            <template v-if="search" v-slot:append>
                <q-icon name="cancel" @click.stop.prevent="search = ''" class="cursor-pointer" />
            </template>
        </q-input>
        </div>
        
      </q-toolbar>

    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const search = ref('');
</script>

<style scoped>
.search-input {
    width: 20%;
}
</style>