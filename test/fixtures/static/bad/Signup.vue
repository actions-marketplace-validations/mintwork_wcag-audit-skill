<template>
  <form @submit.prevent="submit">
    <h1>Sign up</h1>
    <input v-model="email" type="email" placeholder="Email" />
    <img :src="logo" />
    <div @click="submit" class="submit">Create account</div>
    <button @click="close"><i class="icon-close"></i></button>
    <h3>Terms</h3>
  </form>
</template>

<script setup>
const html = "<img src='x'>";
</script>
