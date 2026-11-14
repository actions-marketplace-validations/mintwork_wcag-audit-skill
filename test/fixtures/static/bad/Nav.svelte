<script>
  export let items = [];
  let open = false;
</script>

<nav>
  <span on:click={() => (open = !open)}>Menu</span>
  {#if open}
    <ul>
      {#each items as item}
        <li><a href={item.href}><img src={item.icon}></a></li>
      {/each}
    </ul>
  {/if}
  <input type="text" />
</nav>

<style>
  nav { display: flex; }
</style>
