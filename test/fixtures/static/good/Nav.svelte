<script>
  export let items = [];
  let open = false;
</script>

<nav aria-label="Main">
  <button type="button" aria-expanded={open} on:click={() => (open = !open)}>Menu</button>
  {#if open}
    <ul>
      {#each items as item}
        <li><a href={item.href}><img src={item.icon} alt={item.label}></a></li>
      {/each}
    </ul>
  {/if}
  <label>Search <input type="text" /></label>
</nav>

<style>
  nav { display: flex; }
</style>
