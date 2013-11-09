using System;
using Gtk;

public partial class MainWindow: Gtk.Window
{	
	public MainWindow (): base (Gtk.WindowType.Toplevel)
	{
		Build ();
		this.button2.Clicked += (x,y) => {
			var m = new MessageDialog(this, DialogFlags.Modal | DialogFlags.DestroyWithParent, MessageType.Error, ButtonsType.OkCancel, "{0}", "Hallo");
			m.Run();
			m.Destroy();
		};
	}

	protected void OnDeleteEvent (object sender, DeleteEventArgs a)
	{
		Application.Quit ();
		a.RetVal = true;
	}
}
