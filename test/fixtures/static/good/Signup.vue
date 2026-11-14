<template>
  <form @submit.prevent="submit">
    <h1>Sign up</h1>
    <label for="email">Email</label>
    <input id="email" v-model="email" type="email" placeholder="you@example.com" />
    <img :src="logo" :alt="logoAlt" />
    <button type="submit" class="submit">Create account</button>
    <button type="button" aria-label="Close" @click="close"><i class="icon-close" aria-hidden="true"></i></button>
    <h2>Terms</h2>
    <p>{{ terms }}</p>
  </form>
</template>

<script setup>
const html = "<img src='x'>";
</script>
