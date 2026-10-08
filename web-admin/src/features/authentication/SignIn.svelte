<script lang="ts">
  import { redirectToLoginFromComponent } from "@statsparrot/web-admin/client/redirect-utils";
  import { Button } from "@statsparrot/web-common/components/button";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
</script>

<Button type="primary" onClick={redirectToLoginFromComponent}
  >{m.auth_log_in_sign_up()}</Button
>
